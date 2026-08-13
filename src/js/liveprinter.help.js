import { html as helpContent } from './help.md';
import DOMPurify from 'dompurify';

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
        ${DOMPurify.sanitize(helpContent)}
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