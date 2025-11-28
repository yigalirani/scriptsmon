import * as vscode from 'vscode';
export function start(){
  const sendButton = document.getElementById('sendMessage');
  const messageDiv = document.getElementById('message');
  if (sendButton==null||messageDiv==null)
    throw 'sendButton or messageDiv not found'

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
}
