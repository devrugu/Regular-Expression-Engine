# Regular-Expression-Engine
A small JavaScript based regular expression engine that demonstrates
pattern searching with NFA and DFA techniques.  The matcher first
builds an NFA using Thompson's construction and then converts it to a
DFA for searching. Only a limited subset
of regular expression syntax is implemented but it is enough to show
how state machines work.

## Usage

1. Open `index.html` or `indexC.html` in a modern web browser.
2. Enter a regular expression and the text to search.
3. Click **Apply** to run the matcher and view the results under the
   search box.  Internally the NFA is converted to a DFA before the
   search is performed.

Currently the engine supports literals, `+`, `*`, parentheses and `|`.

For more detailed background information you can also read the Turkish
document *RegularExpressionEngineBilgilendirme.docx*.
