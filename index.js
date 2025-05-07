let aqlData = [];
let selectedIndex = -1;
let selectedListItem = null;

const inputBox = document.getElementById('inputBox');
  const outputBox2 = document.getElementById('outputBox2');
  const highlightBox = document.getElementById('highlightBox');


const keywords = ['SELECT',  'FROM', 'CONTAINS', 'WHERE', 'ORDER BY', 'LIMIT', 'OFFSET', 'NOT', 'LIKE', 'matches', 'exists', '<', '>', '=', '!', 'true', 'false', 'NULL'];
const datatype_keywords = ['VERSION','EHR', 'CONTENT_ITEM', 'ENTRY', 'CARE_ENTRY', 'EVENT', 'ITEM_STRUCTURE', 'ITEM', 'COMPOSITION', 'FOLDER', 'EHR_STATUS', 'EVENT_CONTEXT', 'SECTION', 'GENERIC_ENTRY', 'ADMIN_ENTRY', 'OBSERVATION', 'INSTRUCTION', 'ACTION', 'EVALUATION', 'ACTIVITY', 'HISTORY', 'POINT_EVENT', 'INTERVAL_EVENT', 'FEEDER_AUDIT', 'ITEM_LIST', 'ITEM_SINGLE', 'ITEM_TABLE', 'ITEM_TREE', 'CLUSTER', 'ELEMENT'];
const green_keywords = ['DESC','ASC','AS','DISTINCT', 'AND', 'OR']
let fileurl;

document.getElementById('aqlstore').addEventListener('change', function (e) {
    
    const file = e.target.files[0];
    if (!file) return;
    selectedIndex = -1;
    selectedListItem = null;
    aqlData = [];
    clearFields();

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            aqlData = JSON.parse(event.target.result);
            populateAQLList();
        } catch (err) {
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
});


function populateAQLList() {
    const list = document.getElementById('aql_list');
    list.innerHTML = '';
    aqlData.sort((a, b) => a.title.localeCompare(b.title));

    //localStorage.setItem('aqlData', JSON.stringify(aqlData));


    aqlData.forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = item.title;

        li.onclick = () => {
            // Auto-save current selection before switching
            if (selectedIndex >= 0) {
                aqlData[selectedIndex] = {
                    title: document.getElementById('title').value,
                    description: document.getElementById('descriptionBox').value,
                    AQL: document.getElementById('inputBox').value,
                };
            }

            loadAQL(index); // Load new selection

            // Highlight selection
            if (selectedListItem) selectedListItem.classList.remove('selected');
            li.classList.add('selected');
            selectedListItem = li;
        };

        list.appendChild(li);
    });
}


function loadAQL(index) {
    selectedIndex = index;
    const item = aqlData[index];
    document.getElementById('title').value = item.title;
    document.getElementById('descriptionBox').value = item.description;
    document.getElementById('inputBox').value = item.AQL;
    updateText(); // Optional: update display if needed
}


document.getElementById('save_aql').onclick = function () {
    //if (selectedIndex < 0) return;

    const updated = {
        title: document.getElementById('title').value,
        description: document.getElementById('descriptionBox').value,
        AQL: document.getElementById('inputBox').value,
    };

    // Update the selected item
    aqlData[selectedIndex] = updated;

    // Save the title before sorting
    const currentTitle = updated.title;

    // Repopulate and re-select by title
    populateAQLList();

    // Recalculate the index after sorting
    const newIndex = aqlData.findIndex(a => a.title === currentTitle);
    selectedIndex = newIndex;
    loadAQL(newIndex);

    // Re-highlight
    const listItems = document.querySelectorAll('#aql_list li');
    listItems.forEach(li => {
        if (li.textContent === currentTitle) {
            if (selectedListItem) selectedListItem.classList.remove('selected');
            li.classList.add('selected');
            selectedListItem = li;
        }
    });

    // Optional: offer to download updated file
    triggerDownload();
};


document.getElementById('add_aql').onclick = function () {
    // Generate a unique title
    let baseTitle = "New AQL";
    let title = baseTitle;
    let counter = 1;
    const existingTitles = new Set(aqlData.map(a => a.title));

    while (existingTitles.has(title)) {
        title = `${baseTitle} (${counter++})`;
    }

    const newEntry = {
        title: title,
        description: "",
        AQL: ""
    };

    aqlData.push(newEntry);
    populateAQLList();

    // Find new index (after sorting) and load it
    const newIndex = aqlData.findIndex(a => a.title === title);
    loadAQL(newIndex);

    // Highlight new item
    const listItems = document.querySelectorAll('#aql_list li');
    listItems.forEach(li => {
        if (li.textContent === title) {
            if (selectedListItem) selectedListItem.classList.remove('selected');
            li.classList.add('selected');
            selectedListItem = li;
        }
    });
};

document.getElementById('delete_aql').onclick = function () {
    if (selectedIndex < 0) return;
    aqlData.splice(selectedIndex, 1);
    selectedIndex = -1;
    populateAQLList();
    clearFields();
    //triggerDownload();
};

function clearFields() {
    document.getElementById('title').value = '';
    document.getElementById('descriptionBox').value = '';
    document.getElementById('inputBox').value = '';
}

function triggerDownload() {
    const blob = new Blob([JSON.stringify(aqlData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aql_store_file.json';
    a.click();
    URL.revokeObjectURL(url);
}

function handleTab(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = inputBox.selectionStart;
      const end = inputBox.selectionEnd;

      inputBox.value = inputBox.value.substring(0, start) + '\t' + inputBox.value.substring(end);
      inputBox.selectionStart = inputBox.selectionEnd = start + 1;

      updateText();
    }
  }


  function updateText() {
    const rawText = inputBox.value;

    const cleanedText = rawText
      .replace(/\/\/.*$/gm, '')      // Remove '//' comments
      .replace(/\s+/g, ' ')          // Collapse multiple spaces/tabs/newlines
      .trim();                       // Trim start/end

    //outputBox.value = cleanedText;
    outputBox2.innerHTML = cleanedText;

    // Escape HTML
    let highlightedText = rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Highlight main keywords
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="keyword">$1</span>');
    });
	
	// Highlight data type keywords
    datatype_keywords.forEach(kw => {
      //const regex = new RegExp(`\\b(${dtkw})\\b`, 'gi');
      const regex =new RegExp(`(?<![\\w-])(${kw})(?![\\w-])`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="datatype_keyword">$1</span>');
    });
    
    // Highlight other keywords
    green_keywords.forEach(kw => {
      //const regex = new RegExp(`\\b(${dtkw})\\b`, 'gi');
      const regex =new RegExp(`(?<![\\w-$])(${kw})(?![\\w-])`, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="green_keyword">$1</span>');
    });

    // Highlight parameter keywords
    let regex =new RegExp('(\\$[a-zA-Z_][a-zA-Z0-9_]*)', 'gm');
    //highlightedText = highlightedText.replace(regex, '<span class="parameter_keyword">$1</span>');
    highlightedText = highlightedText.replace(regex, (_, comment) => {
      // Remove any <span> tags inside the comment before wrapping
      const cleanedComment = comment.replace(/<\/?span[^>]*>/gi, '');
      return `<span class="parameter_keyword">${cleanedComment}</span>`;
    });
    
    
    // Highlight comment
    regex = new RegExp('(\/\/.*$)', 'gm');
    //highlightedText = highlightedText.replace(regex, '<span class="comment">$1</span>');
    highlightedText = highlightedText.replace(regex, (_, comment) => {
      // Remove any <span> tags inside the comment before wrapping
      const cleanedComment = comment.replace(/<\/?span[^>]*>/gi, '');
      return `<span class="comment">${cleanedComment}</span>`;
    });
    
    // Replace tabs and line breaks for proper display
    highlightedText = highlightedText
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

    highlightBox.innerHTML = highlightedText;
  }

  function autoFormat() {
    let rawText = inputBox.value;
    rawText= rawText.replace(/\s+/g, ' ').trim();

    // Add line breaks before and after whole keywords
    const formatted = rawText.replace(
      new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi'),
      '\n$1\n\t'
    );
    // Remove multiple blank lines caused by formatting
    const cleaned = formatted.replace(/\n{2,}/g, '\n');

    inputBox.value = cleaned.trim();
    updateText();
}

function downloadHighlightAsImage() {
    // Temporarily expand to fit all content
    const originalHeight = highlightBox.style.height;
    highlightBox.style.height = 'auto';

    html2canvas(highlightBox, {
      useCORS: true,
      scale: 2, // higher scale for better quality
      windowWidth: highlightBox.scrollWidth,
      windowHeight: highlightBox.scrollHeight
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'formatted_aql.png';
      link.href = canvas.toDataURL();
      link.click();

      // Reset style
      highlightBox.style.height = originalHeight;
    });
  }

  function copyOutput() {
    navigator.clipboard.writeText(outputBox2.innerHTML)
      .then(() => alert("Cleaned AQL copied to clipboard!"))
      .catch(() => alert("Failed to copy."));
  }




  /*
  window.addEventListener('beforeunload', function (e) {
    if (aqlData!=[]) {  
        triggerDownload(); // your existing function to save file
        e.preventDefault();
        e.returnValue = ''; // Required by some browsers
    }
});
*/

window.onload = function () {
    const stored = localStorage.getItem('aqlData');
    if (stored) {
        aqlData = JSON.parse(stored);
        populateAQLList();
    }
};


// Debounce utility to avoid excessive saves
function debounce(func, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(func, delay);
    };
}

const autoSaveToLocalStorage = debounce(() => {
    // Save the currently active AQL entry before serializing
    if (selectedIndex >= 0) {
        aqlData[selectedIndex] = {
            title: document.getElementById('title').value,
            description: document.getElementById('descriptionBox').value,
            AQL: document.getElementById('inputBox').value,
        };
    }

    localStorage.setItem('aqlData', JSON.stringify(aqlData));
}, 500); // adjust delay as needed

document.addEventListener('keydown', autoSaveToLocalStorage);
document.addEventListener('click', autoSaveToLocalStorage);


document.getElementById('clear_storage').onclick = function () {
    if (confirm("Are you sure you want to clear all saved AQL data? This cannot be undone.")) {
        localStorage.removeItem('aqlData');
        aqlData = [];
        selectedIndex = -1;
        selectedListItem = null;
        document.getElementById('aql_list').innerHTML = "";
        document.getElementById('title').value = '';
        document.getElementById('descriptionBox').value = '';
        document.getElementById('inputBox').value = '';
        alert("Local storage has been cleared.");
        updateText();
    }
};
