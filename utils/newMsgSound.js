const newMsgSound = (senderName) => {
  let sound = new Audio("/light.mp3");

  sound && sound.play();

  if (senderName) {
    document.title = `New Message from ${senderName}`;

    if (document.visibilityState === "visible") {
      setTimeout(() => {
        document.title = "Messages";
      }, 5000);
    }
  }
};

export default newMsgSound;
