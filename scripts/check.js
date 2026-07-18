var fm = require('./frontend/node_modules/framer-motion');
var r  = require('./frontend/node_modules/react');
var md = fm.motion.div;
console.log('motion.div $$typeof:', String(md['$$typeof']));
var fwd = r.forwardRef(function(p,ref){ return null; });
console.log('React.forwardRef $$typeof:', String(fwd['$$typeof']));
console.log('Match:', String(md['$$typeof']) === String(fwd['$$typeof']));
