var aterm = {};

(function () {
    const
    ATERM_APPL = 0;
    const
    ATERM_LIST = 1;
    const
    ATERM_INT = 2;
    const
    ATERM_STRING = 3;
    const
    ATERM_PLACEHOLDER = 4;
    aterm.ATERM_APPL = ATERM_APPL;
    aterm.ATERM_LIST = ATERM_LIST;
    aterm.ATERM_INT = ATERM_INT;
    aterm.ATERM_STRING = ATERM_STRING;
    aterm.ATERM_PLACEHOLDER = ATERM_PLACEHOLDER;

    function Term (type) {
        this.type = type;
    }

    function annosToString (annos) {
        var s = "{";
        for ( var i = 0; i < annos.length; i++) {
            s += annos[i].toString() + ",";
        }
        if (annos.length > 0) {
            s = s.substring(0, s.length - 1);
        } else {
            return "";
        }
        return s + "}";
    }

    function ApplTerm (cons, children, annos) {
        this.cons = cons;
        this.children = children;
        this.annos = annos || [];
    }

    ApplTerm.prototype = new Term(ATERM_APPL);

    ApplTerm.prototype.toString = function () {
        var s = this.cons + "(";
        for ( var i = 0; i < this.children.length; i++) {
            s += this.children[i].toString() + ",";
        }
        if (this.children.length > 0) {
            s = s.substring(0, s.length - 1);
        }
        return s + ")" + annosToString(this.annos);
    };

    ApplTerm.prototype.match = function (t, matches) {
        if (t.type === ATERM_APPL) {
            if (this.cons === t.cons) {
                if (this.children.length === t.children.length) {
                    for ( var i = 0; i < this.children.length; i++) {
                        if (!this.children[i].match(t.children[i], matches)) {
                            return false;
                        }
                    }
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    ApplTerm.prototype.build = function (values) {
        var children = [];
        for ( var i = 0; i < this.children.length; i++) {
            children.push(this.children[i].build(values));
        }
        return new ApplTerm(this.cons, children);
    };

    function ListTerm (children, annos) {
        this.children = children;
        this.annos = annos || [];
    }

    ListTerm.prototype = new Term(ATERM_LIST);

    ListTerm.prototype.toString = function () {
        var s = "[";
        for ( var i = 0; i < this.children.length; i++) {
            s += this.children[i].toString() + ",";
        }
        if (this.children.length > 0) {
            s = s.substring(0, s.length - 1);
        }
        return s + "]" + annosToString(this.annos);
    };

    ListTerm.prototype.match = function (t, matches) {
        if (t.type === ATERM_LIST) {
            if (this.children.length === t.children.length) {
                for ( var i = 0; i < this.children.length; i++) {
                    if (!this.children[i].match(t.children[i], matches)) {
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    };

    ListTerm.prototype.build = function (values) {
        var children = [];
        for ( var i = 0; i < this.children.length; i++) {
            children.push(this.children[i].build(values));
        }
        return new ListTerm(children);
    };

    function IntTerm (n, annos) {
        this.n = n;
        this.annos = annos || [];
    }

    IntTerm.prototype = new Term(ATERM_INT);

    IntTerm.prototype.toString = function () {
        return this.n + annosToString(this.annos);
    };

    IntTerm.prototype.match = function (t, matches) {
        if (t.type === ATERM_INT) {
            return this.n === t.n;
        } else {
            return false;
        }
    };

    IntTerm.prototype.build = function (values) {
        return this;
    };

    function StringTerm (s, annos) {
        this.s = s;
        this.annos = annos || [];
    }

    StringTerm.prototype = new Term(ATERM_STRING);

    StringTerm.prototype.toString = function () {
        return '"' + this.s + '"' + annosToString(this.annos);
    };

    StringTerm.prototype.match = function (t, matches) {
        if (t.type === ATERM_STRING) {
            return this.s === t.s;
        } else {
            return false;
        }
    };

    StringTerm.prototype.build = function (values) {
        return this;
    };

    function PlaceholderTerm (id) {
        this.id = id;
    }

    PlaceholderTerm.prototype = new Term(ATERM_PLACEHOLDER);

    PlaceholderTerm.prototype.toString = function () {
        return '<' + this.id + '>';
    };

    PlaceholderTerm.prototype.match = function (t, matches) {
        matches[this.id] = t;
        return true;
    };

    PlaceholderTerm.prototype.build = function (values) {
        return values[this.id];
    };

    aterm.ApplTerm = ApplTerm;
    aterm.ListTerm = ListTerm;
    aterm.IntTerm = IntTerm;
    aterm.StringTerm = StringTerm;
    aterm.PlaceholderTerm = PlaceholderTerm;

    function parse (s) {
        var idx = 0;
        function accept (str) {
            for ( var i = 0; i < str.length && idx + i < s.length; i++) {
                if (str[i] != s[idx + i]) {
                    return false;
                }
            }
            return i == str.length;
        }
        function skipWhitespace () {
            while (idx < s.length && (s[idx] === " " || s[idx] === "\n" || s[idx] === "\r" || s[idx] === "\t")) {
                idx++;
            }
        }
        function parseInt () {
            if (s[idx] >= '0' && s[idx] <= '9') {
                var ns = s[idx];
                idx++;
                while (idx < s.length && s[idx] >= '0' && s[idx] <= '9') {
                    ns += s[idx];
                    idx++;
                }
                skipWhitespace();
                return new IntTerm(+ns, parseAnnos());
            } else {
                return null;
            }
        }
        function parseString () {
            if (accept('"')) {
                var ns = "";
                idx++;
                while (!accept('"') || (accept('"') && s[idx - 1] == '\\')) {
                    ns += s[idx];
                    idx++;
                }
                var ns2 = '';
                for ( var i = 0; i < ns.length; i++) {
                    if (ns[i] == "\\") {
                        i++;
                        switch (ns[i]) {
                        case 'n':
                            ns2 += "\n";
                            break;
                        case 't':
                            ns2 += "\t";
                            break;
                        default:
                            ns2 += ns[i];
                        }
                    } else {
                        ns2 += ns[i];
                    }
                }
                idx++;
                skipWhitespace();
                return new StringTerm(ns2, parseAnnos());
            } else {
                return null;
            }
        }
        function parsePlaceholder () {
            if (accept('<')) {
                var ns = "";
                idx++;
                while (!accept('>')) {
                    ns += s[idx];
                    idx++;
                }
                idx++;
                skipWhitespace();
                return new PlaceholderTerm(ns);
            } else {
                return null;
            }
        }
        function parseList () {
            if (accept('[')) {
                var items = [];
                idx++;
                skipWhitespace();
                while (!accept(']')) {
                    items.push(parseExp());
                    if (accept(',')) {
                        idx++; // skip comma
                        skipWhitespace();
                    }
                }
                idx++;
                skipWhitespace();
                return new ListTerm(items, parseAnnos());
            } else {
                return null;
            }
        }
        function parseAnnos () {
            if (accept('{')) {
                var items = [];
                idx++;
                skipWhitespace();
                while (!accept('}')) {
                    items.push(parseExp());
                    if (accept(',')) {
                        idx++; // skip comma
                        skipWhitespace();
                    }
                }
                idx++;
                skipWhitespace();
                return items;
            } else {
                return [];
            }
        }
        function parseAppl () {
            // assumption: it's an appl
            var ns = "";
            while (!accept('(')) {
                ns += s[idx];
                idx++;
            }
            idx++; // skip (
            var items = [];
            while (!accept(')')) {
                items.push(parseExp());
                if (accept(',')) {
                    idx++; // skip comma
                    skipWhitespace();
                }
            }
            idx++;
            skipWhitespace();
            return new ApplTerm(ns, items, parseAnnos());
        }
        function parseExp () {
            var r = parseInt();
            if (r)
                return r;
            r = parseString();
            if (r)
                return r;
            r = parseList();
            if (r)
                return r;
            r = parsePlaceholder();
            if (r)
                return r;
            return parseAppl();
        }
        return parseExp();
    }

    aterm.parse = parse;
}());
/*
 * var matches = {}; print(aterm.parse("Plus(<fst>,
 * <snd>)").match(aterm.parse('Plus(Int("8"), Int("2"))'), matches));
 * print(matches.fst); print(matches.snd); print(aterm.parse("Plus(<snd>,
 * <fst>)").build(matches));
 */