importScripts("aterm.js");

onmessage = function(e){
    var parsetree = aterm.parse(e.data);
    postMessage(parsetree);
};