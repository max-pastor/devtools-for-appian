const vscode = require('vscode');
const { LANGUAGE_ID } = require('./languageId');

const VALID_PREFIXES = new Set([
    'local', 'ri', 'rv', 'pv', 'ac', 'save', 'rule', 'cons',
    'type', 'fn', 'recordtype', 'fv', 'a'
]);

function lintDocumentFactory({ knownAFunctions }) {
    return function lintDocument(document, diagnosticCollection) {
        if (document.languageId !== LANGUAGE_ID) return;

        const diagnostics = [];
        const text = document.getText();
        const lines = text.split(/\r?\n/);

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];

            if (line.trim().startsWith('//')) continue;

            const prefixRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)!/g;
            let prefixMatch;
            while ((prefixMatch = prefixRegex.exec(line)) !== null) {
                const prefix = prefixMatch[1].toLowerCase();
                if (!VALID_PREFIXES.has(prefix)) {
                    let suggestion = '';
                    const candidates = [...VALID_PREFIXES];
                    for (const valid of candidates) {
                        if (valid.startsWith(prefix.substring(0, 2)) || prefix.startsWith(valid.substring(0, 2))) {
                            suggestion = valid;
                            break;
                        }
                    }
                    const msg = suggestion
                        ? `Unknown prefix "${prefixMatch[1]}!". Did you mean "${suggestion}!"?`
                        : `Unknown prefix "${prefixMatch[1]}!". Valid prefixes: local!, ri!, rv!, pv!, rule!, cons!, fn!, type!, a!`;

                    const range = new vscode.Range(lineNum, prefixMatch.index, lineNum, prefixMatch.index + prefixMatch[0].length);
                    diagnostics.push(new vscode.Diagnostic(range, msg, vscode.DiagnosticSeverity.Error));
                }
            }

            const aFuncRegex = /\b(a![a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
            let aFuncMatch;
            while ((aFuncMatch = aFuncRegex.exec(line)) !== null) {
                const funcName = aFuncMatch[1].toLowerCase();
                if (!knownAFunctions.has(funcName)) {
                    const range = new vscode.Range(lineNum, aFuncMatch.index, lineNum, aFuncMatch.index + aFuncMatch[1].length);
                    diagnostics.push(new vscode.Diagnostic(range, `Unknown function "${aFuncMatch[1]}". Check spelling.`, vscode.DiagnosticSeverity.Warning));
                }
            }
        }

        const bracketPairs = { '(': ')', '[': ']', '{': '}' };
        const closingToOpening = { ')': '(', ']': '[', '}': '{' };
        const stack = [];
        let inString = false;
        let inBlockComment = false;
        let inLineComment = false;

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            inLineComment = false;

            for (let col = 0; col < line.length; col++) {
                const ch = line[col];
                const next = col + 1 < line.length ? line[col + 1] : '';

                if (!inString && !inLineComment && ch === '/' && next === '*') {
                    inBlockComment = true;
                    col++;
                    continue;
                }
                if (inBlockComment && ch === '*' && next === '/') {
                    inBlockComment = false;
                    col++;
                    continue;
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
                if (inString) continue;

                if (bracketPairs[ch]) {
                    stack.push({ char: ch, line: lineNum, col: col });
                } else if (closingToOpening[ch]) {
                    if (stack.length > 0 && stack[stack.length - 1].char === closingToOpening[ch]) {
                        stack.pop();
                    } else {
                        const range = new vscode.Range(lineNum, col, lineNum, col + 1);
                        diagnostics.push(new vscode.Diagnostic(range, `Unmatched closing "${ch}"`, vscode.DiagnosticSeverity.Error));
                    }
                }
            }
        }

        for (const unmatched of stack) {
            const expected = bracketPairs[unmatched.char];
            const range = new vscode.Range(unmatched.line, unmatched.col, unmatched.line, unmatched.col + 1);
            diagnostics.push(new vscode.Diagnostic(range, `Unclosed "${unmatched.char}" — expected "${expected}"`, vscode.DiagnosticSeverity.Error));
        }

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            if (line.trim().startsWith('//')) continue;

            let inStr = false;
            let strStart = -1;
            let inBlock = false;

            for (let col = 0; col < line.length; col++) {
                const ch = line[col];
                const next = col + 1 < line.length ? line[col + 1] : '';

                if (ch === '/' && next === '*') { inBlock = true; col++; continue; }
                if (inBlock && ch === '*' && next === '/') { inBlock = false; col++; continue; }
                if (inBlock) continue;
                if (ch === '/' && next === '/') break;

                if (ch === '"') {
                    if (!inStr) {
                        inStr = true;
                        strStart = col;
                    } else {
                        inStr = false;
                    }
                }
            }

            if (inStr) {
                const range = new vscode.Range(lineNum, strStart, lineNum, line.length);
                diagnostics.push(new vscode.Diagnostic(range, 'Unclosed string — missing closing "', vscode.DiagnosticSeverity.Error));
            }
        }

        diagnosticCollection.set(document.uri, diagnostics);
    };
}

function registerLinting(context, { knownAFunctions }) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('appian-sail');
    context.subscriptions.push(diagnosticCollection);

    const lintDocument = lintDocumentFactory({ knownAFunctions });

    if (vscode.window.activeTextEditor) {
        lintDocument(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            lintDocument(event.document, diagnosticCollection);
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                lintDocument(editor.document, diagnosticCollection);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            lintDocument(doc, diagnosticCollection);
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => {
            diagnosticCollection.delete(doc.uri);
        })
    );
}

module.exports = { registerLinting };

