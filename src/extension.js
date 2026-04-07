const vscode = require('vscode');
const { appianData, funcIndex, knownAFunctions } = require('./data');
const { LANGUAGE_ID } = require('./languageId');
const { registerCompletionProvider } = require('./providers/completion');
const { registerHoverProvider } = require('./providers/hover');
const { registerSignatureHelpProvider } = require('./providers/signatureHelp');
const { registerLinting } = require('./linting');
const { registerFormattingProvider } = require('./formatting');

function activate(context) {
    const funcCount = appianData.length;
    const withExamples = appianData.filter(f => f.example).length;
    console.log(`Appian DevTools activated — ${funcCount} functions (${withExamples} with examples)`);

    context.subscriptions.push(
        vscode.commands.registerCommand('devtools-for-appian.triggerSignatureHelpAfterCompletion', () => {
            const ed = vscode.window.activeTextEditor;
            if (!ed || ed.document.languageId !== LANGUAGE_ID) return;
            setTimeout(() => {
                vscode.commands.executeCommand('editor.action.triggerParameterHints');
            }, 50);
        })
    );

    context.subscriptions.push(registerCompletionProvider({ appianData }));
    context.subscriptions.push(registerHoverProvider({ funcIndex }));
    context.subscriptions.push(registerSignatureHelpProvider({ funcIndex }));
    context.subscriptions.push(registerFormattingProvider());

    registerLinting(context, { knownAFunctions });
}

function deactivate() { }

module.exports = { activate, deactivate };

