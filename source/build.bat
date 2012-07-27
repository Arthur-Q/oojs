::compile
python ..\tool\jsCompile.py BaseNamespace.js ../output/base.js ___baseNamespaceName 


::compress
java -jar ..\tool\yuicompressor-2.4.6.jar --charset utf-8 base.js -o base.compress.js
java -jar ..\tool\yuicompressor-2.4.6.jar --charset utf-8 base.js -o base.compress.js


::format
python ..\tool\jsFormat.py base.format.js






