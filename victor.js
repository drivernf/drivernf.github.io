var micActive = false;

function setMic(active) {
    const micBtnElement = document.getElementById('mic-button');
    if (active) {
        recognition = new SpeechRecognition();
        runSpeechRecognition();
    }
    else {
        micActive = false;
        micBtnElement.classList = "";
        if (recognition) {
            recognition.stop();
        }
        if (currentChild && typingIndicator) {
            currentChild.parentNode.parentNode.remove();
        }
    }
}

function micButton() {
    if (!usersTurn) return;
    setMic(!micActive);
}

var msgIndx = 0;
function createChatMessage(isAssistant) {
    const chatInner = document.getElementById('chat-inner');
    const newMsg = document.createElement('div');
    if (!isAssistant) {
        newMsg.classList = "chat-message-wrapper";
        newMsg.innerHTML = `<div class="chat-message"><p id="msg-${msgIndx}" class="chat-interim"></p></div>`;
    }
    else {
        newMsg.classList = "chat-message-wrapper assistant-message-wrapper";
        newMsg.innerHTML = `<div class="chat-message assistant-message"><p id="msg-${msgIndx}" class=""></p></div>`;
    }
    const chatFooter = chatInner.children[chatInner.children.length - 1];
    chatInner.insertBefore(newMsg, chatFooter);
    msgIndx++;
    return msgIndx - 1;
}

function createTypingIndicator(msg) {
    msg.innerHTML = `<div class="typing-indicator"><span class="span1"></span><span class="span2"></span><span class="span3"></span></div>`;
}

function setChatMessageText(isAssistant, currentChild, messageText) {
    if (!currentChild) {
        const newMsgId = createChatMessage(isAssistant);
        currentChild = document.getElementById('msg-' + newMsgId);
        chatScrollToBottom();
    }
    currentChild.innerHTML = messageText;
    //chatScrollToBottom();
    return currentChild;
}

function chatScrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
    chatContainer.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
}

async function typeMessage (message, duration) {
    const characters = message.split("");
    const delay = duration / characters.length;
  
    characters.forEach((char, index) => {
      setTimeout(() => {
        const typedMessage = characters.slice(0, index + 1).join("");
        setChatMessageText(true, currentChild, typedMessage);
      }, index * delay);
    });
};

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var recognition = null;
var isRunning = false;
var currentChild = null;
var typingIndicator = false;
var usersTurn = true;

function runSpeechRecognition() {
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = true;

    recognition.onstart = function() {
        if (!micActive) {
            const micBtnElement = document.getElementById('mic-button');
            micActive = true;
            micBtnElement.classList = "effect-pulse";
            document.getElementById('mic-tooltip').style.display = "none";

            const newMsgId = createChatMessage(false);
            currentChild = document.getElementById('msg-' + newMsgId);
            createTypingIndicator(currentChild);
            typingIndicator = true;
            chatScrollToBottom();
        }
    };
    
    recognition.onspeechend = function() {

    }

    recognition.addEventListener("end", () => {
        if (!micActive) return;
        isRunning = false;
        setTimeout(() => {
            if (!isRunning && usersTurn) {
                recognition.start();
            }
        }, 100);
    });

    recognition.addEventListener("start", () => {
          isRunning = true;
    });
  
    recognition.onresult = function(event) {
        if (event.results[0].isFinal) {
            var transcript = event.results[0][0].transcript;
            var confidence = event.results[0][0].confidence;
            currentChild = setChatMessageText(false, currentChild, transcript);
            currentChild.classList = "";
            currentChild = null;
            typingIndicator = false;

            usersTurn = false;
            document.getElementById('mic-button').classList = 'mic-not-allowed';
            recognition.stop();

            const newMsgId = createChatMessage(true);
            currentChild = document.getElementById('msg-' + newMsgId);
            createTypingIndicator(currentChild);
            chatScrollToBottom();

            const msg = encodeURIComponent(transcript);
            fetch('https://api.jibberjabber.app/victor/' + msg).then(response => {
                if (response.ok) {
                    const botMsg = response.headers.get('content-type');
                    return Promise.all([response.blob(), botMsg]);
                } else {
                    setChatMessageText(true, currentChild, "I'm having trouble thinking.");
                    usersTurn = true;
                    typingIndicator = false;
                    currentChild = null;
                    micActive = false;
                    setMic(true);
                    document.getElementById('mic-button').classList = "effect-pulse";
                    chatScrollToBottom();
                    throw new Error('Error downloading the file.');
                }
            }).then(([blob, botMsg]) => {
                const audio = new Audio(URL.createObjectURL(blob));
                audio.play();
                console.log(botMsg);
                //setChatMessageText(true, currentChild, botMsg);
                audio.addEventListener("loadeddata", () => {
                    let dur = (audio.duration * 1000) - 800;
                    if (dur < 300) dur = 300;
                    console.log(dur);
                    typeMessage(botMsg, dur);
                    chatScrollToBottom();
                    setTimeout(() => {
                        typingIndicator = false;
                        currentChild = null;
                        usersTurn = true;
                        micActive = false;
                        setMic(true);
                        document.getElementById('mic-button').classList = "effect-pulse";
                    }, dur);
                });
            }).catch(error => {
                console.error('Error:', error);
                setChatMessageText(true, currentChild, "I'm having trouble thinking.");
                usersTurn = true;
                typingIndicator = false;
                currentChild = null;
                micActive = false;
                setMic(true);
                document.getElementById('mic-button').classList = "effect-pulse";
                chatScrollToBottom();
            });
        }
        else {
            let interimString = "";
            for(let i = 0; i < event.results.length; i++) {
                interimString += event.results[i][0].transcript;
            }

            currentChild = setChatMessageText(false, currentChild, interimString);
            typingIndicator = false;

            return;
        }

        recognition.stop();
        setTimeout(() => {
            if (!isRunning && usersTurn) {
                recognition.start();
            }
        }, 100);
    };
  
     recognition.start();
}