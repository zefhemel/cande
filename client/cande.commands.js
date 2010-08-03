var cande = window.cande || {};

cande.cmds = {};

(function () {
    cande.cmds.InsertChar = function (editor, character) {
        var cursor = editor.cursor;
        var col = cursor.col;
        var row = cursor.row;
        this.execute = function () {
            editor.lines[row].insert(col, character);
            cursor.moveCursor(row, col + 1);
            editor.setChanged();
        };
        this.undo = function () {
            editor.lines[row].remove(col);
            cursor.moveCursor(row, col);
            editor.setChanged();
        };
    };

    cande.cmds.MoveUp = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            cursor.moveCursor(cursor.row - 1, cursor.col);
        };
    };
    cande.cmds.ScrollUp = function (editor) {
        this.execute = function () {
            if (editor.topRow > 0) {
                editor.topRow--;
                editor.redraw();
            }
        };
    };
    cande.cmds.MoveDown = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            cursor.moveCursor(cursor.row + 1, cursor.col);
        };
    };
    cande.cmds.ScrollDown = function (editor) {
        this.execute = function () {
            editor.topRow++;
            editor.redraw();
        };
    };
    cande.cmds.MoveRight = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            cursor.moveCursor(cursor.row, cursor.col + 1);
        };
    };
    cande.cmds.ScrollRight = function (editor) {
        this.execute = function () {
            editor.leftCol++;
            editor.redraw();
        };
    };
    cande.cmds.MoveNextWord = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            var col = cursor.col;
            var text = editor.lines[cursor.row].text;
            while (/\w/.test(text[col]) && col < text.length) {
                col++;
            }
            while (/\W/.test(text[col]) && col < text.length) {
                col++;
            }
            cursor.moveCursor(cursor.row, col);
        };
    };
    cande.cmds.MoveLeft = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            if (cursor.col > 0) {
                cursor.moveCursor(cursor.row, cursor.col - 1);
            }
        };
    };
    cande.cmds.ScrollLeft = function (editor) {
        this.execute = function () {
            if (editor.leftCol > 0) {
                editor.leftCol--;
                editor.redraw();
            }
        }
    };
    cande.cmds.MovePreviousWord = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            var col = cursor.col;
            var text = editor.lines[cursor.row].text;
            while (/\s/.test(text[col]) && col > 0) {
                col--;
            }
            while (/\w/.test(text[col]) && col > 0) {
                col--;
            }
            cursor.moveCursor(cursor.row, col);
        };
    };
    cande.cmds.Newline = function (editor) {
        var cursor = editor.cursor;
        var row = cursor.row;
        var col = cursor.col;
        this.execute = function () {
            editor.splitLine(row, col);
            cursor.moveCursor(row + 1, 0);
            editor.setChanged();
        };
        this.undo = function () {
            editor.joinLine(row);
            cursor.moveCursor(row, col);
            editor.setChanged();
        };
    };

    cande.cmds.DeleteBackward = function (editor) {
        var cursor = editor.cursor;
        var row = cursor.row;
        var col = cursor.col;
        var cmd = this;
        this.execute = function () {
            if (col > 0) {
                cmd.c = editor.lines[row].text[col - 1];
                editor.lines[row].remove(col - 1);
                cursor.moveCursor(row, col - 1);
            } else if (row > 0) {
                cmd.idx = editor.lines[row - 1].text.length;
                cursor.moveCursor(row - 1, editor.lines[row - 1].text.length);
                editor.joinLine(row - 1);
            }
            editor.setChanged();
        };

        this.undo = function () {
            if (col > 0) {
                editor.lines[row].insert(col - 1, cmd.c);
            } else if (row > 0) {
                editor.splitLine(row - 1, cmd.idx);
            }
            cursor.moveCursor(row, col);
            editor.setChanged();
        };
    };

    cande.cmds.DeleteForward = function (editor) {
        var cursor = editor.cursor;
        var row = cursor.row;
        var col = cursor.col;
        var cmd = this;
        this.execute = function () {
            cmd.tLength = editor.lines[row].text.length;
            cmd.lLength = editor.lines.length;
            if (cursor.col < editor.lines[row].text.length) {
                cmd.c = editor.lines[row].text[col];
                editor.lines[cursor.row].remove(col);
            } else if (row + 1 < editor.lines.length) {
                editor.joinLine(row);
            }
            editor.setChanged();
        };

        this.undo = function () {
            if (col < cmd.tLength) {
                editor.lines[row].insert(col, cmd.c);
            } else if (row + 1 < cmd.lLength) {
                editor.splitLine(row, col);
            }
            cursor.moveCursor(row, col);
            editor.setChanged();
        };
    };

    cande.cmds.KillRestOfLine = function (editor) {
        var cursor = editor.cursor;
        var row = cursor.row;
        var col = cursor.col;
        var cmd = this;
        this.execute = function () {
            var line = editor.lines[cursor.row];
            cmd.tLength = line.text.length;
            if (line.text.length > 0) {
                cmd.removedText = line.text.substring(col);
                cmd.removedMask = line.mask.slice(col);
                line.text = line.text.substring(0, col);
                line.mask.splice(col, line.text.length - col);
                line.redraw();
            } else {
                editor.joinLine(cursor.row);
            }
            editor.setChanged();
        };
        this.undo = function () {
            var line = editor.lines[row];
            if (cmd.tLength > 0) {
                line.text += cmd.removedText;
                line.mask = line.mask.concat(cmd.removedMask);
                line.redraw();
            } else {
                editor.splitLine(row, col);
            }
            cursor.moveCursor(row, col);
            editor.setChanged();
        };
    };

    cande.cmds.ConcatLines = function (editor) {
        var cursor = editor.cursor;
        var row = cursor.row;
        var col = cursor.col;
        var cmd = this;
        this.execute = function () {
            cmd.idx = editor.lines[row].text.length;
            editor.joinLine(cursor.row);
            editor.setChanged();
        };
        this.undo = function () {
            editor.splitLine(row, cmd.idx);
            cursor.moveCursor(row, col);
            editor.setChanged();
        };
    };
    cande.cmds.MoveBeginningOfLine = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            cursor.moveCursor(cursor.row, 0);
        };
    };
    cande.cmds.MoveEndOfLine = function (editor) {
        var cursor = editor.cursor;
        this.execute = function () {
            cursor.moveCursor(cursor.row, editor.lines[cursor.row].text.length);
        };
    };

    cande.cmds.Undo = function (editor) {
        this.execute = function () {
            if (editor.history.length > 0) {
                var act = editor.history.pop();
                act.undo();
                editor.setChanged();
            }
        };
    };

    cande.cmds.Paste = function (editor) {
        this.execute = function () {
            var copynpaster = $("#cbtext")[0];
            copynpaster.focus();
            copynpaster.select();
            setTimeout(function () {
                        var text = copynpaster.value;
                        if(text) {
                            editor.insertText(editor.cursor.row, editor.cursor.col, text);
                        }
                    }, 1);
            editor.setChanged();
            return true;
        };
    };
}());