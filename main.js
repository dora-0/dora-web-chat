$(function() {
    const FADE_TIME = 150; // ms
    const TYPING_TIMER_LENGTH = 400; // ms
    const COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    // Initialize variables
    const $window = $(window);
    const $usernameInput = $('.usernameInput'); // Input for username
    const $usernameMsg = $('#usernameMsg');
    const $messages = $('.messages'); // Messages area
    const $inputMessage = $('.inputMessage'); // Input message input box

    const $loginPage = $('.login.page'); // The login page
    const $chatPage = $('.chat.page'); // The chatroom page

    // Prompt for setting a username
    var username;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();

    const socket = io('https://chat.mandora.xyz');

    const checkNotifyPerm = () => {
        Notification.requestPermission().then(r => {
            if (r !== 'granted') {
                console.warn("Notification 권한 획득에 실패했습니다.");
            }
        });
        return Notification.permission === 'granted';
    };

    const addAutoMentionEvent = (data) => {
        var $username = $('.username');
        $username.unbind('click.AutoMention');
        $username.bind('click.AutoMention', function(){
            var username = data.username;
            $inputMessage.val(
                $inputMessage.val() + "@" + username + " "
            );
        });
    };

    const addParticipantsMessage = (data) => {
        var message = '';
        // if (data.numUsers === 1) {
        //   message += "there's 1 participant";
        // } else {
        //   message += "there are " + data.numUsers + " participants";
        // }
        message += "현재 " + data.numUsers + "명이 접속 중입니다.";
        log(message);
    };

    // Sets the client's username
    const setUsername = () => {
        username = cleanInput($usernameInput.val().trim());

        // If the username is valid
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();

            // Tell the server your username
            socket.emit('add user', username);
        }
    };

    // Sends a chat message
    const sendMessage = () => {
        var message = $inputMessage.val();
        // Prevent markup from being injected into the message
        message = cleanInput(message);
        // if there is a non-empty message and a socket connection
        if (message && connected) {
            $inputMessage.val('');
            const data = {
                username: username,
                message: message
            };
            addChatMessage(data);
            // tell server to execute 'new message' and send along one parameter
            socket.emit('new message', message);
            addAutoMentionEvent(data);
        }
    };

    // Log a message
    const log = (message, options) => {
        const $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    };

    // Adds the visual chat message to the message list
    const addChatMessage = (data, options) => {
        // Don't fade the message in if there is an 'X was typing'
        const $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        if (data.message.includes("@" + username + " ")) {
            data.color = "red";

            if (window.Notification && checkNotifyPerm()) { //not supported for mobile
                var notify_options = {
                    body: data.message,
                    icon: "/favicon.ico"
                };
                try {
                    var notification = new Notification(data.username, notify_options);

                    // setTimeout(function() {
                    //     notification.close();
                    // }, 5000);
                } catch (e) {
                    console.warn("Warning: Not supported for this platform");
                }
            }
        }

        //클라이언트에서 메시지를 보낼 때는 메시지를 DOM에 추가 후 서버로 emit 하므로 ipaddr를 받아올 수 없다.
        //따라서 data.ipaddr이 정의되어 있지 않으면 IP 주소를 표시하지 않음.
        //TODO: 어떤 상황에서든 IP 주소가 보이게 하기
        var ipaddr = data.ipaddr;

        if (typeof ipaddr == "undefined" || ipaddr == null || ipaddr === "") {
            ipaddr = "";
        }
        else {
            ipaddr = "(" + ipaddr + ")";
        }

        const $usernameDiv = $('<span class="username"/>')
            .text(data.username + ipaddr)
            .css('color', getUsernameColor(data.username));

        const $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message)
            .css('color', data.color);

        const typingClass = data.typing ? 'typing' : '';
        const $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    };

    // Adds the visual chat typing message
    const addChatTyping = (data) => {
        data.typing = true;
        data.message = '님이 입력하는 중 ...';
        addChatMessage(data);
    };

    // Removes the visual chat typing message
    const removeChatTyping = (data) => {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    };

    // Adds a message element to the messages and scrolls to the bottom
    // el - The element to add as a message
    // options.fade - If the element should fade-in (default = true)
    // options.prepend - If the element should prepend
    //   all other messages (default = false)
    const addMessageElement = (el, options) => {
        const $el = $(el);

        // Setup default options
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // Apply options
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    };

    // Prevents input from having injected markup
    const cleanInput = (input) => {
        return $('<div/>').text(input).html();
    };

    // Updates the typing event
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(() => {
                const typingTimer = (new Date()).getTime();
                const timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    };

    // Gets the 'X is typing' messages of a user
    const getTypingMessages = (data) => {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    };

    // Gets the color of a username through our hash function
    const getUsernameColor = (username) => {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        const index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    };



    // Keyboard events
    $window.keydown(event => {
        // Auto-focus the current input when a key is typed
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // When the client hits ENTER on their keyboard
        if (event.which === 13) {
            initUser();
        }
    });

    $inputMessage.on('input', () => {
        updateTyping();
    });


    function initUser() {
        if (username) {
            sendMessage();
            socket.emit('stop typing');
            typing = false;
        } else {
            //비회원일 때 닉네임 중복 검사
            if ($usernameInput.attr('type') !== 'hidden') {
                const tmp = cleanInput($usernameInput.val().trim());
                if (tmp) {
                    $usernameMsg.css('color', 'white');
                    $usernameMsg.text('닉네임 중복 검사 중 ...');
                    socket.emit('verify user', {
                        username: tmp,
                        require_task: "storeClientInfo"
                    });
                }
            }
            //회원이면 현재 접속 중인지 체크
            else {
                const tmp = cleanInput($usernameInput.val().trim());
                if (tmp) {
                    socket.emit('storeClientInfo', {
                        username: tmp,
                        user_type: "member"
                    });
                }
            }
        }
    }
    // Click events

    // Focus input when clicking anywhere on login page
    $loginPage.click(() => {
        $currentInput.focus();
        initUser();
    });

    // Focus input when clicking on the message input's border
    $inputMessage.click(() => {
        $inputMessage.focus();
    });

    // Socket events

    // Whenever the server emits 'login', log the login message
    socket.on('login', (data) => {
        connected = true;
        // Display the welcome message
        const message = "서버에 연결되었습니다! - Welcome to Socket.IO Chat Server";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
        checkNotifyPerm();
    });

    socket.on('verify user', (data) => {
        // console.log(data);
        if (data.verified === false) {
            $usernameMsg.css('color', 'yellow');
            $usernameMsg.html('이미 사용 중인 닉네임이거나 다른 세션에서 접속 중입니다.<br/>다시 시도해 보세요.');
        }
        else if (data.verified === true && data.require_task === "storeClientInfo") {
            //비회원일 경우 현재 접속 중인 유저의 닉네임 체크
            const tmp = cleanInput($usernameInput.val().trim());
            if (tmp) {
                socket.emit('storeClientInfo', {
                    username: tmp,
                    user_type: "guest"
                });
            }
        }
        else {
            setUsername();
        }
    });
    // Whenever the server emits 'new message', update the chat body
    socket.on('new message', (data) => {
        addChatMessage(data);
        addAutoMentionEvent(data);
    });

    // Whenever the server emits 'user joined', log it in the chat body
    socket.on('user joined', (data) => {
        log(data.username + '님이 들어왔습니다.');
        addParticipantsMessage(data);
    });

    // Whenever the server emits 'user left', log it in the chat body
    socket.on('user left', (data) => {
        log(data.username + '님이 나갔습니다.');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // Whenever the server emits 'typing', show the typing message
    socket.on('typing', (data) => {
        addChatTyping(data);
    });

    // Whenever the server emits 'stop typing', kill the typing message
    socket.on('stop typing', (data) => {
        removeChatTyping(data);
    });

    socket.on('disconnect', () => {
        log('연결이 해제되었습니다.');
    });

    socket.on('reconnect', () => {
        log('서버에 다시 연결되었습니다!');
        if (username) {
            socket.emit('add user', username);
        }
    });

    socket.on('reconnect_error', () => {
        log('서버 연결에 실패했습니다. 잠시 후 다시 연결을 시도합니다 ...');
    });

});
