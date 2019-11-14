'use strict';

self.addEventListener('notificationclick', (event) => {  //Notification을 클릭할 떄 이벤트를 정의합니다.
    event.notification.close();  // Notification을 닫습니다.

    event.waitUntil(clients.matchAll({  //같은 주소의 페이지가 열려있는 경우 focus
        type: 'window'
    }).then((clientList) => {
        for (var i = 0; i < clientList.length; i++) {
            var client = clientList[i];
            if (client.url === '/' && 'focus' in client) {
                return client.focus();
            }
        }

        if (clients.openWindow) { //같은 주소가 아닌 경우 새창으로
            return clients.openWindow(event.notification.data);
        }
    }));
});