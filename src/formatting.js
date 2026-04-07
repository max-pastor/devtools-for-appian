const vscode = require('vscode');
const { LANGUAGE_ID } = require('./languageId');

function registerFormattingProvider() {
    return vscode.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, {
        provideDocumentFormattingEdits(document, options) {
            const edits = [];
            let indentLevel = 0;
            let inBlockComment = false;

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const text = line.text;
                const trimmed = text.trim();

                if (trimmed.length === 0) {
                    if (text.length > 0) {
                        edits.push(vscode.TextEdit.delete(new vscode.Range(i, 0, i, text.length)));
                    }
                    continue;
                }

                let currentLineIndentLevel = indentLevel;

                const startsWithBlockCommentClose = trimmed.startsWith('*/');

                if (!inBlockComment || startsWithBlockCommentClose) {
                    let closingBracketsPrefix = 0;
                    for (let j = 0; j < trimmed.length; j++) {
                        const c = trimmed[j];
                        if (c === ')' || c === ']' || c === '}') {
                            closingBracketsPrefix++;
                        } else if (c === ' ' || c === '\t' || c === ',') {
                            continue;
                        } else {
                            break;
                        }
                    }
                    currentLineIndentLevel = Math.max(0, currentLineIndentLevel - closingBracketsPrefix);
                }

                if (!inBlockComment || startsWithBlockCommentClose) {
                    let correctIndent = '';
                    if (options.insertSpaces) {
                        correctIndent = ' '.repeat(currentLineIndentLevel * options.tabSize);
                    } else {
                        correctIndent = '\t'.repeat(currentLineIndentLevel);
                    }

                    const leadingWhiteSpaceMatch = text.match(/^\s*/);
                    const leadingWhiteSpace = leadingWhiteSpaceMatch ? leadingWhiteSpaceMatch[0] : '';

                    if (leadingWhiteSpace !== correctIndent) {
                        edits.push(vscode.TextEdit.replace(
                            new vscode.Range(i, 0, i, leadingWhiteSpace.length),
                            correctIndent
                        ));
                    }
                }

                let inString = false;
                let inLineComment = false;
                let bracketDelta = 0;

                for (let col = 0; col < text.length; col++) {
                    const ch = text[col];
                    const next = col + 1 < text.length ? text[col + 1] : '';

                    if (!inString && !inLineComment && ch === '/' && next === '*') {
                        inBlockComment = true;
                        col++; continue;
                    }
                    if (inBlockComment && ch === '*' && next === '/') {
                        inBlockComment = false;
                        col++; continue;
                    }
                    if (inBlockComment) continue;

                    if (!inString && ch === '/' && next === '/') {
                        inLineComment = true;
                        break;
                    }

                    if (ch === '"' && !inLineComment) {
                        inString = !inString;
                        continue;
                    }

                    if (!inString && !inLineComment) {
                        if (ch === '(' || ch === '[' || ch === '{') {
                            bracketDelta++;
                        } else if (ch === ')' || ch === ']' || ch === '}') {
                            bracketDelta--;
                        }
                    }
                }

                indentLevel += bracketDelta;
                if (indentLevel < 0) indentLevel = 0;
            }

            return edits;
        }
    });
}

module.exports = { registerFormattingProvider };

