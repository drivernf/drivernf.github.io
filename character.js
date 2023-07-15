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
    if (!SpeechRecognition) {
        const modal = document.getElementById('modal');
        modal.style.display = "block";
        setTimeout(() => {
            modal.classList.add('modal-show');
        }, 1);
        return;
    }

    if (!usersTurn) return;
    setMic(!micActive);
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('modal-show');
    setTimeout(() => {
        modal.style.display = "none";
    }, 10);
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
    return currentChild;
}

function chatScrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
    chatContainer.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
}

var chatCont = null;

function calculateScrollPercentage() {
    if (!chatCont) chatCont = document.getElementById('chat-container');
    const scrollTop = chatCont.scrollTop;
    const scrollHeight = chatCont.scrollHeight - chatCont.clientHeight;
    const scrollPercentage = (scrollTop / scrollHeight) * 100;
  
    return scrollPercentage.toFixed(2);
}

async function typeMessage (message, duration) {
    const characters = message.split("");
    const delay = duration / characters.length;
  
    characters.forEach((char, index) => {
      setTimeout(() => {
        const beforeScrollPercentage = calculateScrollPercentage();
        const typedMessage = characters.slice(0, index + 1).join("");
        setChatMessageText(true, currentChild, typedMessage);
        if (beforeScrollPercentage > 99.0) {
            chatScrollToBottom();
        } 
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
            fetch(`https://api.jibberjabber.app/${characterName}/` + msg).then(response => {
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
            }).then(async([blob, botMsg]) => {
                const botAudio = new Audio(URL.createObjectURL(blob));
                if (characterName === "clyde") {
                    await playWithEffects(blob);
                    botAudio.volume = 0.0;
                }
                botAudio.onplaying = () => {
                    let dur = (botAudio.duration * 1000) - 800;
                    if (dur < 300) dur = 300;
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
                }
                botAudio.play();
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