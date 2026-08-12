const helpModalHTML = `
<!-- LivePrinter Help Modal -->
<div class="modal fade" id="liveprinterHelpModal" tabindex="-1" aria-labelledby="liveprinterHelpModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="liveprinterHelpModalLabel">LivePrinter Quick Help</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        
        <h4>LivePrinter Quick Help</h4>
        <p>This is a live coding environment for 3D printers. Write a mix of minigrammar or JavaScript code in the editor, select it, and press the run shortcut to execute it on your printer immediately.</p>

        <hr>

        <h4><i class="bi bi-keyboard"></i> Keypresses</h4>
        <p>Common keypresses to execute code and control the UI:</p>
        <ul>
          <li><strong>Run Selected Code:</strong> <code>Ctrl+Enter</code> or <code>Cmd+Enter</code></li>
          <li><strong>Run Current Line:</strong> <code>Shift+Enter</code></li>
          <li><strong>Toggle Sidebar:</strong> <code>Ctrl+H</code></li>
          <li><strong>Toggle Editor Panels:</strong> <code>Ctrl+h</code></li>
        </ul>

        <hr>

        <ul>
            <li><strong>toggle logging GCode in the GCode editor</strong><code>logGCode = true;</code></li>
        </ul>

        <hr>

        <h4><i class="bi bi-braces"></i> Syntax Reference</h4>
        <p>LivePrinter has a few special syntax features to make coding easier.</p>
        
        <h6>Math.js Expressions</h6>
        <p>You can embed <a href="https://mathjs.org/docs/expressions/syntax.html" target="_blank">math.js</a> expressions directly in your code by wrapping them in <code>m'...'</code>. They will be evaluated before your code runs.</p>
        <pre><code>// Moves the printer in a sine wave
for (let i = 0; i < 360; i++) {
  await printer.move({ y: m'sin(i * pi/180) * 10' });
}</code></pre>

        <h6>Async shortcut</h6>
        <p>To wrap block of code in an async function, wrap it in <code>{{...}}</code>.
        <pre><code
{{
    // code
}}
// Code after this block can run immediately
info("Loop has been queued.");</code></pre>

        <hr>

        <h4><i class="bi bi-gear"></i> Key Functions</h4>
        <p>Here are some of the core functions available in the global scope and on the <code>printer</code> object.</p>
        
        <table class="table">
          <thead>
            <tr>
              <th>Function</th>
              <th>Description</th>
            </tr>
          </thead>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>
`;

/**
 * Injects the help modal and button into the DOM.
 */
export function initHelpModal(afterElementId) {
    document.body.insertAdjacentHTML('beforeend', helpModalHTML);

    const helpButtonHTML = `<li class="nav-item"><button type="button" class="btn btn-sm btn-secondary" data-bs-toggle="modal" data-bs-target="#liveprinterHelpModal">?</button></li>`;
    const examplesDropdown = document.getElementById(afterElementId);
    if (examplesDropdown) {
        examplesDropdown.closest('.nav-item.btn-group').insertAdjacentHTML('afterend', helpButtonHTML);
    }
}