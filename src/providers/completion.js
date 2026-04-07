const vscode = require('vscode');
const { LANGUAGE_ID } = require('../languageId');
const {
    extractSyntax,
    extractParams,
    extractDescription,
    extractExample,
    extractExampleResult
} = require('../docParsers');

/** Built-in trigger often runs before the snippet applies; defer so the cursor is inside `( )`. */
const TRIGGER_PARAMETER_HINTS = {
    command: 'devtools-for-appian.triggerSignatureHelpAfterCompletion',
    title: 'Show signature'
};

function registerCompletionProvider({ appianData }) {
    return vscode.languages.registerCompletionItemProvider(LANGUAGE_ID, {
        provideCompletionItems() {
            return appianData.map(func => {
                const item = new vscode.CompletionItem(func.label, vscode.CompletionItemKind.Function);

                const syntax = extractSyntax(func.documentation);
                const description = extractDescription(func.documentation);
                const params = extractParams(syntax);
                const example = func.example || extractExample(func.documentation);
                const exampleResult = func.exampleResult || extractExampleResult(func.documentation);

                item.detail = syntax || `${func.label}()`;

                const md = new vscode.MarkdownString();
                md.appendMarkdown(`**${func.label}** — Appian\n\n`);
                md.appendMarkdown(`${description}\n\n`);
                if (syntax) {
                    md.appendMarkdown(`---\n\n`);
                    md.appendMarkdown(`**Syntax:**\n`);
                    md.appendCodeblock(syntax, LANGUAGE_ID);
                }
                if (params.length > 0) {
                    md.appendMarkdown(`\n**Parameters:** ${params.join(', ')}\n`);
                }
                if (example) {
                    md.appendMarkdown(`\n---\n\n`);
                    md.appendMarkdown(`**Example:**\n`);
                    md.appendCodeblock(example, LANGUAGE_ID);
                    if (exampleResult) {
                        md.appendMarkdown(`\n**Result:**\n`);
                        md.appendCodeblock(exampleResult, 'text');
                    }
                }
                md.isTrusted = true;
                item.documentation = md;

                item.insertText = new vscode.SnippetString(`${func.label}($0)`);
                item.command = TRIGGER_PARAMETER_HINTS;

                if (func.label.startsWith('a!')) {
                    item.sortText = `0_${func.label}`;
                } else {
                    item.sortText = `1_${func.label}`;
                }

                return item;
            });
        }
    }, 'a', '!', '(');
}

module.exports = { registerCompletionProvider };
