var cande = window.cande || {};

cande.defaultKeyBindings = {
    "characterDefault": cande.cmds.InsertChar,
    "up": cande.cmds.MoveUp,
    "C-up": cande.cmds.ScrollUp,
    "down": cande.cmds.MoveDown,
    "C-down": cande.cmds.ScrollDown,
    "right": cande.cmds.MoveRight,
    "C-right": cande.cmds.ScrollRight,
    "A-right": cande.cmds.MoveNextWord,
    "left": cande.cmds.MoveLeft,
    "C-left": cande.cmds.ScrollLeft,
    "A-left": cande.cmds.MovePreviousWord,
    "return": cande.cmds.Newline,
    "backspace": cande.cmds.DeleteBackward,
    "delete": cande.cmds.DeleteForward,
    "C-K": cande.cmds.KillRestOfLine,
    "C-J": cande.cmds.ConcatLines,
    "home": cande.cmds.MoveBeginningOfLine,
    "end": cande.cmds.MoveEndOfLine,
    "M-left": cande.cmds.MoveBeginningOfLine,
    "M-right": cande.cmds.MoveEndOfLine,
    "C-Z": cande.cmds.Undo,
    "M-V": cande.cmds.Paste,
    "C-V": cande.cmds.Paste
};