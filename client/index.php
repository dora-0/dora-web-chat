<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
  <title>Socket.IO Chat Example</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <ul class="pages">
    <li class="chat page">
      <div class="chatArea">
        <ul class="messages"></ul>
      </div>
      <input class="inputMessage" placeholder="여기에 입력..."/>
    </li>
    <li class="login page">
      <div class="form">
        <h3 class="title">닉네임을 입력하세요.</h3>
        <input class="usernameInput" type="text" maxlength="14" />
      </div>
    </li>
    <li class="load page">
      <div id="notify-section" class="section">
        <img style='max-width: 128px' src='img/antenna.png' />
        <h3 class="title">서버에 연결하는 중...</h3>
      </div>
    </li>
  </ul>

  <script>
    function init_login() {
      document.getElementsByClassName('login')[0].style.display = "block";
      document.getElementsByClassName('load')[0].style.display = "none";
    }

    function load_error() {
      document.getElementById("notify-section").innerHTML = "<img style='max-width: 128px' src='img/broken-link.png' /><br/><h3 class='title'>연결에 실패했습니다.</h3>";
    }
  </script>
  <script src="https://code.jquery.com/jquery-1.10.2.min.js"></script>
  <script src="https://dora.koreacentral.cloudapp.azure.com:3001/socket.io/socket.io.js" onload="init_login()" onerror="load_error()"></script>
  <script src="https://dora.koreacentral.cloudapp.azure.com:3001/public/main.js"></script>
</body>
</html>