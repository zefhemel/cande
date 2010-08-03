//load("aterm.js");
aterm.traversal = {};

if (!Function.prototype.curry) {
    Function.prototype.curry = function () {
        var fn = this, args = Array.prototype.slice.call(arguments);
        return function () {
            return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
        };
    };
}

(function () {
    function all (fn, t) {
        switch (t.type) {
        case aterm.ATERM_APPL:
            var newChildren = [];
            var result;
            for ( var i = 0; i < t.children.length; i++) {
                result = fn(t.children[i]);
                if (result !== null) {
                    newChildren.push(result);
                } else {
                    return null;
                }
            }
            return new aterm.ApplTerm(t.cons, newChildren);
            break;
        case aterm.ATERM_LIST:
            var newChildren = [];
            var result;
            for ( var i = 0; i < t.children.length; i++) {
                result = fn(t.children[i]);
                if (result !== null) {
                    newChildren.push(result);
                } else {
                    return null;
                }
            }
            return new aterm.ListTerm(newChildren);
            break;
        case aterm.ATERM_INT:
        case aterm.ATERM_STRING:
        case aterm.ATERM_PLACEHOLDER:
            return t;
        default:
            console.log("FAIL: " + t.type);
            break;
        }
    }

    function one (fn, t) {
        switch (t.type) {
        case aterm.ATERM_APPL:
            var newChildren = [];
            var result;
            var oneSucceeded = false;
            for ( var i = 0; i < t.children.length; i++) {
                result = fn(t.children[i]);
                if (result !== null) {
                    newChildren.push(result);
                    oneSucceeded = true;
                } else {
                    newChildren.push(t.children[i]);
                }
            }
            if (oneSucceeded) {
                return new aterm.ApplTerm(t.cons, newChildren);
            } else {
                return null;
            }
            break;
        case aterm.ATERM_LIST:
            var newChildren = [];
            var result;
            var oneSucceeded = false;
            for ( var i = 0; i < t.children.length; i++) {
                result = fn(t.children[i]);
                if (result !== null) {
                    newChildren.push(result);
                    oneSucceeded = true;
                } else {
                    newChildren.push(t.children[i]);
                }
            }
            if (oneSucceeded) {
                return new aterm.ListTerm(t.cons, newChildren);
            } else {
                return null;
            }
            break;
        case aterm.ATERM_INT:
        case aterm.ATERM_STRING:
        case aterm.ATERM_PLACEHOLDER:
            return t;
        }
    }

    /**
     * Sequential application last argument is term
     */
    function seq () {
        var t = arguments[arguments.length - 1];
        var fn;
        for ( var i = 0; i < arguments.length - 1; i++) {
            fn = arguments[i];
            t = fn(t);
            if (t === null) {
                return null;
            }
        }
        return t;
    }

    /**
     * Left-choice (<+) application last argument is term
     */
    function leftChoice () {
        var t = arguments[arguments.length - 1];
        var fn, result;
        for ( var i = 0; i < arguments.length - 1; i++) {
            fn = arguments[i];
            result = fn(t);
            if (result !== null) {
                return result;
            }
        }
        return null;
    }

    function attempt (fn, t) {
        var result = fn(t);
        return result !== null ? result : t;
    }

    function debug (t) {
        print(t.toString());
        return t;
    }

    function alltd (fn, t) {
        return leftChoice(fn, all.curry(alltd.curry(fn)), t);
    }

    function topdown (fn, t) {
        return seq(fn, all.curry(topdown.curry(fn)), t);
    }

    aterm.traversal.all = all;
    aterm.traversal.one = one;
    aterm.traversal.seq = seq;
    aterm.traversal.leftChoice = leftChoice;
    aterm.traversal.attempt = attempt;
    aterm.traversal.debug = debug;
    aterm.traversal.alltd = alltd;
    aterm.traversal.topdown = topdown;
}());
