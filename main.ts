import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';

interface HeadingAdjustmentSettings {}

const DEFAULT_SETTINGS: HeadingAdjustmentSettings = {};

export default class HeadingLevelAdjustmentPlugin extends Plugin {
    settings: HeadingAdjustmentSettings;

    async onload() {
        await this.loadSettings();

        // Increase heading level (make headings smaller, towards H1)
        this.addCommand({
            id: 'increase-heading-level',
            name: 'Increase Heading Level',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.adjustHeadingLevel(editor, false);
            }
        });

        // Decrease heading level (make headings larger, towards H6)
        this.addCommand({
            id: 'decrease-heading-level',
            name: 'Decrease Heading Level',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.adjustHeadingLevel(editor, true);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async adjustHeadingLevel(editor: Editor, decrease: boolean) {
        const cursor = editor.getCursor();
        const hasSelection = editor.somethingSelected();
        const rangeStart = editor.getCursor('from');
        const rangeEnd = editor.getCursor('to');
        const lines = hasSelection ? editor.getRange(rangeStart, rangeEnd).split('\n') : [editor.getLine(cursor.line)];

        // Pre-adjustment check
        let adjustmentBlocked = lines.some(line => {
            if (this.isHeading(line)) {
                const level = this.getHeadingLevel(line);
                return (decrease && level >= 6) || (!decrease && level <= 1);
            }
            return false;
        });

        if (adjustmentBlocked) {
            new Notice('Adjustment blocked: A heading is at the minimum or maximum level.');
            return;
        }

        // Proceed with adjustment
        const adjustedLines = lines.map(line => {
            if (this.isHeading(line)) {
                return decrease ? `#${line}` : line.substring(1);
            }
            return line;
        });

        const adjustedText = adjustedLines.join('\n');
        if (hasSelection) {
            editor.replaceRange(adjustedText, rangeStart, rangeEnd);
            // Extend selection to include the full modified range
            editor.setSelection(rangeStart, { line: rangeStart.line + adjustedLines.length - 1, ch: adjustedLines[adjustedLines.length - 1].length });
        } else {
            editor.setLine(cursor.line, adjustedText);
            // Adjust cursor position considering the heading change
            const newPos = decrease ? Math.min(cursor.ch + 1, adjustedText.length) : Math.max(0, cursor.ch - 1);
            editor.setCursor({ line: cursor.line, ch: newPos });
        }
    }

    isHeading(line: string): boolean {
        return /^#+\s/.test(line);
    }

    getHeadingLevel(line: string): number {
        const match = line.match(/^#+/);
        return match ? match[0].length : 0;
    }
}
