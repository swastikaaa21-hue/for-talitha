const { JSDOM } = require('jsdom');
JSDOM.fromFile('d:/FOR TALITHA/index.html', { runScripts: 'dangerously', resources: 'usable' }).then(dom => {
    dom.window.console.error = (msg) => console.log('PAGE ERROR:', msg);
    dom.window.console.log = (msg) => console.log('PAGE LOG:', msg);
    dom.window.addEventListener('error', e => console.log('CAUGHT:', e.message));
    setTimeout(()=>console.log('Done'), 5000);
});
