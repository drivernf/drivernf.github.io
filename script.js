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
    }
}

function micButton() {
    setMic(!micActive);
}

var msgIndx = 0;
function createUserMessage() {
    const chatInner = document.getElementById('chat-inner');
    const newMsg = document.createElement('div');
    newMsg.classList = "chat-message-wrapper";
    newMsg.innerHTML = `<div class="chat-message"><p id="msg-${msgIndx}" class="chat-interim"></p></div>`;
    const chatFooter = chatInner.children[chatInner.children.length - 1];
    chatInner.insertBefore(newMsg, chatFooter);
    msgIndx++;
    return msgIndx - 1;
}

function setUserMessageText(currentChild, messageText) {
    if (!currentChild) {
        const newMsgId = createUserMessage();
        currentChild = document.getElementById('msg-' + newMsgId);
    }
    currentChild.innerHTML = messageText;
    chatScrollToBottom();
    return currentChild;
}

function chatScrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    chatContainer.scrollTop = chatContainer.scrollHeight;
    chatContainer.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
}

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
var recognition = null;
var isRunning = false;

function runSpeechRecognition() {
    var output = document.getElementById("output");
    var action = document.getElementById("action");
    var interim = document.getElementById("interim");
    let currentChild = null;

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = true;

    recognition.onstart = function() {
        // action.innerHTML = "<small>listening, please speak...</small>";
        if (!micActive) {
            const micBtnElement = document.getElementById('mic-button');
            micActive = true;
            micBtnElement.classList = "effect-pulse";
            const tooltip = document.getElementById('mic-tooltip').style.display = "none";
        }
    };
    
    recognition.onspeechend = function() {
        // action.innerHTML = "<small>stopped listening, hope you are done...</small>";
    }

    recognition.addEventListener("end", () => {
        if (!micActive) return;
          console.log("Speech recognition service disconnected");
        isRunning = false;
        setTimeout(() => {
            if (!isRunning) {
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
            // output.innerHTML = "<b>Text:</b> " + transcript + "<br/> <b>Confidence:</b> " + confidence*100+"%";
            // interim.innerHTML = "";
            currentChild = setUserMessageText(currentChild, transcript);
            currentChild.classList = "";
            currentChild = null;
        }
        else {
            let interimString = "";
            for(let i = 0; i < event.results.length; i++) {
                interimString += event.results[i][0].transcript;
            }

            // interim.innerHTML = interimString;
            console.log(interimString);
            currentChild = setUserMessageText(currentChild, interimString);

            return;
        }

        recognition.stop();
        setTimeout(() => {
            if (!isRunning) {
                recognition.start();
            }
        }, 100);
    };
  
     recognition.start();
}