var cande = window.cande || {};
(function () {
    function getStyle (node) {
        if (node) {
            return 'green';
        } else {
            return 'black';
        }
    }

    function Editor (canvas, language) {
        var context = canvas[0].getContext('2d');
        this.context = context;
        this.lines = [];
        this.topRow = 0;
        this.visibleRows = 50;
        this.leftCol = 0;
        this.visibleCols = 80;
        this.language = language
        context.font = '14px "Courier"';
        this.CHAR_WIDTH = context.measureText("m").width;
        this.LINE_HEIGHT = 15;
        this.cursor = new Cursor(this);
        this.history = [];
        this.changedSinceLastParse = false;

        var that = this;
        var cursor = this.cursor;

        that.keyBindings = cande.defaultKeyBindings;

        canvas.click(function (evt) {
            var x = evt.pageX - canvas.position().left;
            var y = evt.pageY - canvas.position().top;
            var col = that.leftCol + Math.floor(x / that.CHAR_WIDTH);
            var row = that.topRow + Math.floor(y / that.LINE_HEIGHT);
            cursor.moveCursor(row, col);
        });
        setInterval(function () {
            parse(that);
        }, 1000);
        $(document).keydown(function (evt) {
            var keyMap = {
                38: 'up',
                40: 'down',
                39: 'right',
                37: 'left',
                13: 'return',
                8: 'backspace',
                46: 'delete',
                35: 'end',
                36: 'home'
            };
            if (!keyMap[evt.keyCode]) {
                keyName = String.fromCharCode(evt.keyCode);
            } else {
                keyName = keyMap[evt.keyCode];
            }
            if (evt.ctrlKey && evt.metaKey) {
                keyName = 'C-' + keyName;
            }
            if (evt.altKey) {
                keyName = 'A-' + keyName;
            }
            if (evt.metaKey && !evt.ctrlKey) {
                keyName = 'M-' + keyName;
            }
            if (evt.shiftKey) {
                keyName = 'S-' + keyName;
            }
            console.log("Key: " + keyName);
            if (that.keyBindings[keyName]) {
                var command = new (that.keyBindings[keyName])(that, keyName);
                var rv = command.execute();
                if (command.undo) {
                    that.history.push(command);
                }
                if (!rv) {
                    evt.preventDefault();
                }
            }
        });
        $(document).keypress(function (evt) {
            if (!evt.charCode)
                return;
            var keyName = String.fromCharCode(evt.charCode);
            var command;
            if (keyName in that.keyBindings) {
                command = new (that.keyBindings[keyName])(that, keyName);
            } else if (!evt.altKey && !evt.ctrlKey && !evt.metaKey) {
                command = new (that.keyBindings.characterDefault)(that, keyName);
            }
            if (command) {
                command.execute();
                if (command.undo) {
                    that.history.push(command);
                }
            }
        });
    }

    Editor.prototype.getText = function () {
        var s = '';
        for ( var i = 0; i < this.lines.length; i++) {
            s += this.lines[i].text + "\n";
        }
        return s.substring(0, s.length - 1);
    };
    
    Editor.prototype.setChanged = function() {
        this.changedSinceLastParse = true;
    };

    Editor.prototype.setText = function (text) {
        this.lines = [];
        var textLines = text.split(/\n/);
        for ( var i = 0; i < textLines.length; i++) {
            this.addLine(new Line(textLines[i]));
        }
        this.cursor.row = this.cursor.col = 0;
        this.redraw();
    };

    Editor.prototype.insertText = function (row, col, text) {
        this.setText(text);
    };

    Editor.prototype.setMask = function (row, col, mask) {
        this.lines[row].mask[col] = mask;
    };

    Editor.prototype.addLine = function (line) {
        this.lines.push(line);
        line.editor = this;
        line.row = this.lines.length - 1;
    };

    Editor.prototype.insertLine = function (row, line) {
        this.lines.splice(row, 0, line);
        line.editor = this;
        line.row = row;
        for ( var i = row + 1; i < this.lines.length; i++) {
            this.lines[i].row++;
        }
        this.redraw();
    };

    Editor.prototype.removeLine = function (row) {
        this.lines.splice(row, 1);
        for ( var i = row; i < this.lines.length; i++) {
            this.lines[i].row--;
        }
        this.redraw();
    };

    Editor.prototype.splitLine = function (row, col) {
        var line = this.lines[row];
        var restText = line.text.substring(col);
        var restMask = line.mask.slice(col);
        line.text = line.text.substring(0, col);
        line.mask = line.mask.slice(0, col);
        this.insertLine(row + 1, new Line(restText, restMask));
    };

    Editor.prototype.joinLine = function (row) {
        var line = this.lines[row];
        var nextLine = this.lines[row + 1];
        line.text += nextLine.text;
        line.mask = line.mask.concat(nextLine.mask);
        this.removeLine(row + 1);
    };

    Editor.prototype.redraw = function () {
        var maxRow = Math.min(this.visibleRows + this.topRow, this.lines.length);
        var context = this.context;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, this.visibleCols * this.CHAR_WIDTH, (this.visibleRows * this.LINE_HEIGHT) + 5);
        for ( var i = this.topRow; i < maxRow; i++) {
            this.lines[i].draw(context);
        }
    };

    function Cursor (editor, row, col) {
        this.editor = editor;
        this.row = row || 0;
        this.col = col || 0;
        this.visible = false;
        var that = this;
        setInterval(function () {
            that.toggleCursor();
        }, 400);
    }

    Cursor.prototype.drawCursor = function () {
        var context = this.editor.context;
        var CHAR_WIDTH = this.editor.CHAR_WIDTH;
        var LINE_HEIGHT = this.editor.LINE_HEIGHT;
        var relativeCol = this.col - this.editor.leftCol;
        var relativeRow = this.row - this.editor.topRow;
        context.fillStyle = '#404040';
        context.fillRect(relativeCol * CHAR_WIDTH, (relativeRow * LINE_HEIGHT) + 3, 2, LINE_HEIGHT - 1);
    };

    Cursor.prototype.hideCursor = function () {
        var context = this.editor.context;
        var CHAR_WIDTH = this.editor.CHAR_WIDTH;
        var LINE_HEIGHT = this.editor.LINE_HEIGHT;
        var relativeCol = this.col - this.editor.leftCol;
        var relativeRow = this.row - this.editor.topRow;
        context.fillStyle = '#ffffff';
        context.fillRect(relativeCol * CHAR_WIDTH, (relativeRow * LINE_HEIGHT) + 3, CHAR_WIDTH, LINE_HEIGHT - 1);
        if (this.col < this.editor.lines[this.row].text.length) {
            this.editor.lines[this.row].drawChar(this.col);
        }
    };

    Cursor.prototype.toggleCursor = function () {
        this.visible = !this.visible;
        if (this.visible) {
            this.drawCursor();
        } else {
            this.hideCursor();
        }
    };

    Cursor.prototype.moveCursor = function (row, col) {
        var editor = this.editor;
        this.hideCursor();
        if (row >= editor.lines.length) {
            row = editor.lines.length - 1;
        }
        if (col > editor.lines[row].text.length) {
            col = editor.lines[row].text.length;
        }
        this.col = col;
        this.row = row;
        this.drawCursor();
    };

    function Line (text, mask) {
        this.editor = null;
        this.row = null;
        this.text = text;
        if (!mask) {
            mask = [];
            for ( var i = 0; i < text.length; i++) {
                mask.push(null);
            }
        }
        this.mask = mask;
    }

    Line.prototype.insert = function (col, text, mask) {
        this.text = this.text.substring(0, col) + text + this.text.substring(col);
        if (!mask) {
            mask = [];
            for ( var i = 0; i < text.length; i++) {
                mask.push(null);
            }
        }
        this.mask.splice.apply(this.mask, [ col, 0 ].concat(mask));
        this.redraw();
    };

    Line.prototype.remove = function (col) {
        this.text = this.text.substring(0, col) + this.text.substring(col + 1);
        this.mask.splice(col, 1);
        this.redraw();
    };

    Line.prototype.redraw = function () {
        var editor = this.editor;
        var context = editor.context;
        context.fillStyle = '#ffffff';
        context.fillRect(0, (this.row - editor.topRow) * editor.LINE_HEIGHT, editor.visibleCols * editor.CHAR_WIDTH,
                editor.LINE_HEIGHT + 3);
        this.draw(context);
    };

    Line.prototype.draw = function (context) {
        var editor = this.editor;
        var LINE_HEIGHT = editor.LINE_HEIGHT;
        var CHAR_WIDTH = editor.CHAR_WIDTH;
        context.fillStyle = '#000000';
        var text = this.text;
        var mask = this.mask;
        var col = 0;
        var maxLength = Math.min(editor.leftCol + editor.visibleCols, text.length);
        var topRow = editor.topRow;
        for ( var i = editor.leftCol; i < maxLength; i++) {
            context.fillStyle = getStyle(mask[i]);
            context.fillText(text[i], (col * CHAR_WIDTH), (this.row - topRow + 1) * LINE_HEIGHT);
            col++;
        }
    };

    Line.prototype.drawChar = function (col) {
        var context = this.editor.context;
        var LINE_HEIGHT = this.editor.LINE_HEIGHT;
        var CHAR_WIDTH = this.editor.CHAR_WIDTH;
        context.fillStyle = getStyle(this.mask[col]);
        context.fillText(this.text[col], (col - this.editor.leftCol) * CHAR_WIDTH, (this.row - this.editor.topRow + 1)
                * LINE_HEIGHT);
    };

    // Parsing and syntax highlighting
    function parse (editor) {
        if (editor.language && editor.changedSinceLastParse) {
            var text = editor.getText();
            editor.changedSinceLastParse = false;
            $.getJSON("http://localhost:8080/candeparser/parse?lang=" + editor.language + "&callback=?", {
                code: text
            }, function (data, status, r) {
                var parsetree = aterm.parse(data);
                // worker.postMessage(data);
                    color(editor, parsetree);
                });
        }
    }

    function color (editor, t) {
        var row = 0, col = 0;
        var parentT = t;
        var path = [];
        // console.log(t.toString());
        function isAST (parent, idx) {
            for ( var i = 0; i < parent.annos.length; i++) {
                if (parent.annos[i].n === idx) {
                    return true;
                }
            }
            return false;
        }
        function traverse (t) {
            // console.log(t.toString());
            switch (t.type) {
            case aterm.ATERM_STRING:
                if (t.type === aterm.ATERM_STRING) {
                    var s = t.s;
                    // console.log("Cursor: (" + row + ", " + col + "): '" + s +
                    // "'
                    // node: " + parentT.toString() + " Path: " + path);
                    if (isAST(parentT, path[path.length - 1])) {
                        // console.log("Is identifier: " + s);
                    } else {
                        // console.log("Is keyword: " + s);
                        for ( var i = 0; i < s.length; i++) {
                            editor.setMask(row, col + i, 1);
                        }
                    }
                    for ( var i = 0; i < s.length; i++) {
                        if (s[i] == "\n") {
                            row++;
                            col = 0;
                        } else {
                            col++;
                        }
                    }
                }
                break;
            case aterm.ATERM_APPL:
                var oldParent = parentT;
                parentT = t;
                for ( var i = 0; i < t.children.length; i++) {
                    path.push(i);
                    traverse(t.children[i]);
                    path.pop(i);
                }
                parentT = oldParent;
                break;
            case aterm.ATERM_LIST:
                var oldParent = parentT;
                parentT = t;
                for ( var i = 0; i < t.children.length; i++) {
                    path.push(i);
                    traverse(t.children[i]);
                    path.pop(i);
                }
                parentT = oldParent;
                break;
            }
        }
        traverse(t);
        editor.redraw();
    }

    cande.Editor = Editor;
    cande.Line = Line;
    cande.Cursor = Cursor;

}());

var worker = new Worker("worker.js");
worker.onmessage = function (e) {
    color(editor, e.data);
};

$(function () {
    var canvas = $("#canvas");
    canvas.attr("height", window.innerHeight - 20);
    canvas.attr("width", window.innerWidth - 20);
    // canvas.attr("contentEditable", "true")

    var editor = new cande.Editor(canvas, "Java-15");
    window.editor = editor;

    editor.setText("var name = 8;\nn = 7*7;");
    editor.redraw();

});