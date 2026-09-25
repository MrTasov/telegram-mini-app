// Package the current, tested DEV runtime without rebuilding it.
require('child_process').execFileSync('python3',[require('path').join(__dirname,'package-dev.py'),...process.argv.slice(2)],{stdio:'inherit'});
