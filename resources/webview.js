const vscode = acquireVsCodeApi();

const sendButton = document.getElementById('sendMessage');
const messageDiv = document.getElementById('message');

sendButton.addEventListener('click', () => {
    vscode.postMessage({
        command: 'buttonClick',
        text: 'Hello from webview!'
    });
});

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateContent':
            messageDiv.insertAdjacentHTML('beforeend', `<li>${message.text}</li>`);
            break;
    }
});

