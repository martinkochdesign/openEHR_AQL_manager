const version = '0.6.2';

document.getElementById('version_info').innerHTML =
  '<i>Version:&nbsp;</i> ' + version;


//INITIATE CONSTANTS
let selectedAQL = null;
let aqlData = [];
let selectedListItem = null;

const inputBox = document.getElementById('inputBox');
const outputBox2 = document.getElementById('outputBox2');
const highlightBox = document.getElementById('highlightBox');

const keywords = ['SELECT',  'FROM', 'CONTAINS', 'WHERE', 'ORDER BY', 'LIMIT', 'OFFSET'];
const datatype_keywords = ['VERSION','EHR', 'CONTENT_ITEM', 'ENTRY', 'CARE_ENTRY', 'EVENT', 'ITEM_STRUCTURE', 'ITEM', 'COMPOSITION', 'FOLDER', 'EHR_STATUS', 'EVENT_CONTEXT', 'SECTION', 'GENERIC_ENTRY', 'ADMIN_ENTRY', 'OBSERVATION', 'INSTRUCTION', 'ACTION', 'EVALUATION', 'ACTIVITY', 'HISTORY', 'POINT_EVENT', 'INTERVAL_EVENT', 'ITEM_LIST', 'ITEM_SINGLE', 'ITEM_TABLE', 'ITEM_TREE', 'CLUSTER', 'ELEMENT'];
const green_keywords = ['DESC','ASC','AS','DISTINCT', 'AND', 'OR', 'NOT', 'LIKE', 'matches', 'exists', 'true', 'false', 'NULL']
let fileurl;



//WORKFLOW AT FIRST EXECUTION

//set all input fields to disabled
toggleInputDisabled(true);

// if there is local storage, load it
window.onload = function () {
    const stored = localStorage.getItem('aqlData');
    if (stored) {
        aqlData = JSON.parse(stored);

        // Normalize older entries
        aqlData.forEach(a => {
            if (!a.paramValues) a.paramValues = {};
            if (!a.folderPath) a.folderPath = ""; 
        });
        
        populateAQLList();
    }
};


// FUNCTIONS
function getDetectedParamsFromHighlight() {
  const container = document.getElementById("highlightBox");
  const spans = container.querySelectorAll("span.parameter_keyword");
  const params = Array.from(spans).map(s => s.textContent.trim()); // "$ehr_id"
  // unique + strip "$"
  return [...new Set(params)]
    .map(p => p.startsWith('$') ? p.slice(1) : p)
    .filter(Boolean);
}

function renderParamEditor() {
  const editor = document.getElementById('paramEditor');
  if (!editor) return;

  if (!selectedAQL) {
    editor.innerHTML = '';
    return;
  }

  const params = getDetectedParamsFromHighlight();
  selectedAQL.paramValues = selectedAQL.paramValues || {};

  if (params.length === 0) {
    //editor.innerHTML = '<div><b>Query parameters:</b> none detected</div>';
    editor.innerHTML = ''; 
    return;
  }

  const rows = params.map(name => {
    const val = selectedAQL.paramValues[name] ?? '';
    return `
      <div style="display:flex; gap:8px; margin:6px 0; align-items:center;">
        <label style="min-width:120px;">$${name}</label>
        <input class="query_parameter_input" data-param="${name}" value="${String(val).replace(/"/g, '&quot;')}"
               style="flex:1;" placeholder="add example value..." />
      </div>
    `;
  }).join('');

  editor.innerHTML = `<div><b>Query parameters:</b></div>${rows}`;

  editor.querySelectorAll('input[data-param]').forEach(inp => {
    inp.addEventListener('input', () => {
      const key = inp.getAttribute('data-param');
      selectedAQL.paramValues[key] = inp.value;

      // Persist using your existing mechanism
      autoSaveToLocalStorage();

      // Update payload instantly
      preparePostmanPayload();
    });
  });
}

function parseParamDefaultsFromAql(rawText) {
  const defaults = {};
  const re = /^\s*\/\/\s*@param\s+(\$?[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/gm;

  let m;
  while ((m = re.exec(rawText)) !== null) {
    const name = m[1].startsWith('$') ? m[1].slice(1) : m[1];
    const rawVal = m[2];

    // Try JSON parse to allow "strings", numbers, true/false, arrays, objects.
    // Fallback: keep as plain string.
    let val;
    try { val = JSON.parse(rawVal); } catch { val = rawVal; }

    defaults[name] = val;
  }
  return defaults;
}

function preparePostmanPayload() {
  const container = document.getElementById("highlightBox");
  const spans = container.querySelectorAll("span.parameter_keyword");
  const keywords = Array.from(spans).map(span => span.textContent.trim());

  const jsonStructure = {
    q: "",
    offset: 0,
    fetch: 100,
    query_parameters: {}
  };

  const saved = (selectedAQL && selectedAQL.paramValues) ? selectedAQL.paramValues : {};

  keywords.forEach(word => {
    const cleanWord = word.startsWith('$') ? word.slice(1) : word;
    jsonStructure.query_parameters[cleanWord] = saved[cleanWord] ?? "";
  });

  jsonStructure.q = document.getElementById('outputBox2').textContent;

  document.getElementById('outputPostman').innerText = JSON.stringify(jsonStructure, null, 4);
  return jsonStructure;
}


const autoSaveToLocalStorage = debounce(() => {
    if (selectedAQL) {
        selectedAQL.title = document.getElementById('title').value;
        selectedAQL.description = document.getElementById('descriptionBox').value;
        selectedAQL.AQL = document.getElementById('inputBox').value;
        //document.getElementById('folderPath').value = normalizeFolderPath(document.getElementById('folderPath').value);
        selectedAQL.folderPath = document.getElementById('folderPath').value;
    }
    localStorage.setItem('aqlData', JSON.stringify(aqlData));
    populateAQLList(document.getElementById('searchInput').value);
}, 500);

function toggleInputDisabled(state){
    //input fields
    document.getElementById('title').disabled = state;
    document.getElementById('descriptionBox').disabled = state;
    document.getElementById('inputBox').disabled = state;
    //buttons
    document.getElementById('clipboardButton').disabled = state;
    document.getElementById('clipboardButton2').disabled = state;
    document.getElementById('snapshotButton').disabled = state;
    document.getElementById('formatButton').disabled = state;
    document.getElementById('folderPath').disabled = state;
}

function loadAQL(aqlObject) {
    selectedAQL = aqlObject;
    document.getElementById('title').value = aqlObject.title;
    document.getElementById('descriptionBox').value = aqlObject.description;
    document.getElementById('inputBox').value = aqlObject.AQL;
    document.getElementById('folderPath').value = aqlObject.folderPath || "";
    toggleInputDisabled(false);
    updateText();
}

function buildFolderTree(items) {
  const root = { __items: [] };

  for (const item of items) {
    const raw = (item.folderPath || "").trim();
    const parts = raw.split("/").map(s => s.trim()).filter(Boolean);

    let node = root;
    for (const p of parts) {
      node[p] = node[p] || { __items: [] };
      node = node[p];
    }
    node.__items.push(item);
  }
  return root;
}

function renderFolderNode(node, parentEl, currentPath = "", { autoOpenFolders = false } = {}) {
  // Render subfolders first (sorted)

  

  const folderNames = Object.keys(node)
    .filter(k => k !== "__items")
    .sort((a, b) => a.localeCompare(b));
  
    for (const folderName of folderNames) {
        //const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        const details = document.createElement("details");

        const folderPath = (currentPath ? currentPath : "") + folderName + "/";
          details.dataset.path = folderPath;
          details.open = autoOpenFolders || openFolderPaths.has(folderPath);


        details.dataset.path = folderPath;
        // Restore open/closed state:
        details.open = autoOpenFolders || openFolderPaths.has(folderPath);
        // Keep the set up-to-date when user opens/closes folders:
        details.addEventListener("toggle", () => {
          if (details.open) openFolderPaths.add(folderPath);
          else openFolderPaths.delete(folderPath);
          saveOpenFolders();
        });
        const summary = document.createElement("summary");
        summary.textContent = folderName;
        const ul = document.createElement("ul");
        ul.style.marginLeft = "12px";
        details.appendChild(summary);
        details.appendChild(ul);
        parentEl.appendChild(details);
        renderFolderNode(node[folderName], ul, folderPath, { autoOpenFolders });
      }
      

  // Render items in this folder (sorted)
  const items = (node.__items || []).slice().sort((a, b) => a.title.localeCompare(b.title));
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item.title;

    li.onclick = () => {
      // Auto-save previous
      if (selectedAQL) {
        selectedAQL.title = document.getElementById('title').value;
        selectedAQL.description = document.getElementById('descriptionBox').value;
        selectedAQL.AQL = document.getElementById('inputBox').value;
        selectedAQL.folderPath = document.getElementById('folderPath').value; // NEW
      }

      loadAQL(item);

      if (selectedListItem) selectedListItem.classList.remove("selected");
      li.classList.add("selected");
      selectedListItem = li;
    };

    // Reapply selected class
    if (selectedAQL && item === selectedAQL) {
      li.classList.add("selected");
      selectedListItem = li;
    }

    parentEl.appendChild(li);
  }
}

function populateAQLList(filterText = '') {
  const list = document.getElementById('aql_list');

  // --- Preserve UI state before re-render ---
  const prevScrollTop = list.scrollTop;

  // Capture currently open folders
  openFolderPaths.clear();
  list.querySelectorAll('details[open]').forEach(d => {
    const p = d.dataset.path;
    if (p) openFolderPaths.add(p);
  });


  // --- Force-open the selected AQL's folder path (and all ancestors) ---
  const addAncestorsToOpenFolders = (folderPath) => {
    const norm = normalizeFolderPath(folderPath || ""); // ensures trailing "/"
    if (!norm) return;

    const parts = norm.split('/').filter(Boolean); // handles trailing "/"
    let acc = "";
    for (const part of parts) {
      acc += part + "/";
      openFolderPaths.add(acc);
    }
  };
  

  if (selectedAQL) {
    const fp = selectedAQL.folderPath || "";
    if (fp.trim() === "") {
      // Selected is unsorted -> ensure Unsorted group opens (if you use it)
      openFolderPaths.add('__unsorted__');
    } else {
      addAncestorsToOpenFolders(fp);
    }
  }
    

  saveOpenFolders();

  // --- Clear and rebuild ---
  list.innerHTML = '';

  const includeDescription = document.getElementById('includeDescription').checked;
  const lowerFilter = (filterText || '').toLowerCase().trim();

  const filtered = aqlData.filter(item => {
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const folder = (item.folderPath || '').toLowerCase();

    if (lowerFilter === '') return true;

    const titleMatch = title.includes(lowerFilter);
    const descMatch = includeDescription && desc.includes(lowerFilter);
    const folderMatch = folder.includes(lowerFilter);

    return titleMatch || descMatch || folderMatch;
  });

  const autoOpenFolders = lowerFilter.length > 0;
  const tree = buildFolderTree(filtered);

  // --- Render "Unsorted" bucket (optional) ---
  const unsortedItems = (tree.__items || []);
  if (unsortedItems.length > 0) {
    const UNSORTED_KEY = '__unsorted__';

    const details = document.createElement('details');
    details.dataset.path = UNSORTED_KEY;
    details.open = autoOpenFolders || openFolderPaths.has(UNSORTED_KEY);

    details.addEventListener('toggle', () => {
      if (details.open) openFolderPaths.add(UNSORTED_KEY);
      else openFolderPaths.delete(UNSORTED_KEY);
      saveOpenFolders();
    });

    const summary = document.createElement('summary');
    summary.textContent = 'Unsorted';

    const ul = document.createElement('ul');
    ul.style.marginLeft = '12px';

    details.appendChild(summary);
    details.appendChild(ul);
    list.appendChild(details);

    renderFolderNode({ __items: unsortedItems }, ul, '', { autoOpenFolders });
  }

  // --- Render real folders (excluding root __items) ---
  renderFolderNode({ ...tree, __items: [] }, list, '', { autoOpenFolders });

  // Restore scroll position
  list.scrollTop = prevScrollTop;
}

function populateAQLList_OLD3(filterText = '') {
  const list = document.getElementById('aql_list');

  // --- Preserve UI state before re-render ---
  const prevScrollTop = list.scrollTop;

  // Capture currently open folders (so we can restore after re-render)
  openFolderPaths.clear();
  list.querySelectorAll('details[open]').forEach(d => {
    const p = d.dataset.path;
    if (p) openFolderPaths.add(p);
  });
  saveOpenFolders();

  // --- Clear and rebuild ---
  list.innerHTML = '';

  const includeDescription = document.getElementById('includeDescription').checked;
  const lowerFilter = (filterText || '').toLowerCase().trim();

  const filtered = aqlData.filter(item => {
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const folder = (item.folderPath || '').toLowerCase();

    const titleMatch = title.includes(lowerFilter);
    const descMatch = includeDescription && desc.includes(lowerFilter);
    const folderMatch = folder.includes(lowerFilter); // optional but usually helpful

    return lowerFilter === '' ? true : (titleMatch || descMatch || folderMatch);
  });

  const autoOpenFolders = lowerFilter.length > 0;

  const tree = buildFolderTree(filtered);

  // --- Render "Unsorted" (items with empty folderPath) ---
  const unsortedItems = (tree.__items || []);
  if (unsortedItems.length > 0) {
    const UNSORTED_KEY = '__unsorted__';

    const details = document.createElement('details');
    details.dataset.path = UNSORTED_KEY;
    details.open = autoOpenFolders || openFolderPaths.has(UNSORTED_KEY);

    details.addEventListener('toggle', () => {
      if (details.open) openFolderPaths.add(UNSORTED_KEY);
      else openFolderPaths.delete(UNSORTED_KEY);
      saveOpenFolders();
    });

    const summary = document.createElement('summary');
    summary.textContent = 'Unsorted';

    const ul = document.createElement('ul');
    ul.style.marginLeft = '12px';

    details.appendChild(summary);
    details.appendChild(ul);
    list.appendChild(details);

    // Render only the unsorted items into this UL
    renderFolderNode({ __items: unsortedItems }, ul, '', { autoOpenFolders });
  }

  // --- Render actual folder tree (excluding root __items) ---
  renderFolderNode({ ...tree, __items: [] }, list, '', { autoOpenFolders });

  // Restore scroll position (optional but nice)
  list.scrollTop = prevScrollTop;
}

function populateAQLList_OLD2(filterText = '') {
  const list = document.getElementById('aql_list');

  const prevScrollTop = list.scrollTop;   // optional: keep scroll
  captureOpenFolders();   

  list.innerHTML = '';

  const includeDescription = document.getElementById('includeDescription').checked;
  const lowerFilter = filterText.toLowerCase();

  const filtered = aqlData.filter(item => {
    const titleMatch = (item.title || "").toLowerCase().includes(lowerFilter);
    const descMatch = includeDescription && (item.description || "").toLowerCase().includes(lowerFilter);
    const folderMatch = (item.folderPath || "").toLowerCase().includes(lowerFilter); // optional but useful
    return titleMatch || descMatch || folderMatch;
  });

  const tree = buildFolderTree(filtered);

  // If searching, it’s usually nicer to auto-open folders
  const autoOpenFolders = lowerFilter.length > 0;

  // Optionally group items with no folder under an "Unsorted" folder:
  if ((tree.__items || []).length > 0) {
    const unsortedDetails = document.createElement("details");
    if (autoOpenFolders) unsortedDetails.open = true;

    const summary = document.createElement("summary");
    summary.textContent = "Unsorted";

    const ul = document.createElement("ul");
    ul.style.marginLeft = "12px";

    unsortedDetails.appendChild(summary);
    unsortedDetails.appendChild(ul);
    list.appendChild(unsortedDetails);

    renderFolderNode({ __items: tree.__items }, ul, { autoOpenFolders });
  }

  // Render real folders
  renderFolderNode({ ...tree, __items: [] }, list, { autoOpenFolders });

  list.scrollTop = prevScrollTop;   
}


function populateAQLList_OLD(filterText = '') {
    const list = document.getElementById('aql_list');
    list.innerHTML = '';

    const includeDescription = document.getElementById('includeDescription').checked;
    const lowerFilter = filterText.toLowerCase();

    aqlData
        .filter(item => {
            const titleMatch = item.title.toLowerCase().includes(lowerFilter);
            const descMatch = includeDescription && item.description.toLowerCase().includes(lowerFilter);
            return titleMatch || descMatch;
        })
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.title;

            li.onclick = () => {
                // Auto-save previous
                if (selectedAQL) {
                    selectedAQL.title = document.getElementById('title').value;
                    selectedAQL.description = document.getElementById('descriptionBox').value;
                    selectedAQL.AQL = document.getElementById('inputBox').value;
                }

                loadAQL(item);

                if (selectedListItem) selectedListItem.classList.remove('selected');
                li.classList.add('selected');
                selectedListItem = li;
               

            };
            
            // Reapply selected class if this item is currently selected
            if (selectedAQL && item.title === selectedAQL.title) {
                li.classList.add('selected');
                selectedListItem = li;
            }

            list.appendChild(li);
        });
}




function refreshAqlList(download){
    if (selectedAQL) {
    selectedAQL.title = document.getElementById('title').value;
    selectedAQL.description = document.getElementById('descriptionBox').value;
    selectedAQL.AQL = document.getElementById('inputBox').value;

    const currentTitle = selectedAQL.title;
    //populateAQLList();
    populateAQLList(document.getElementById('searchInput').value);

    const newItem = aqlData.find(a => a.title === currentTitle);
    loadAQL(newItem);

    const listItems = document.querySelectorAll('#aql_list li');
    listItems.forEach(li => {
        if (li.textContent === currentTitle) {
            if (selectedListItem) selectedListItem.classList.remove('selected');
            li.classList.add('selected');
            selectedListItem = li;
        }
    });
  }

    if (download){
        triggerDownload();
    }
    
}

function clearFields() {
    document.getElementById('title').value = '';
    document.getElementById('descriptionBox').value = '';
    document.getElementById('inputBox').value = '';
    document.getElementById('highlightBox').innerHTML = '';
    document.getElementById('outputBox2').innerHTML = '';
    document.getElementById('outputPostman').innerHTML = '';
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

    if (selectedAQL) {
    const defaults = parseParamDefaultsFromAql(rawText);
    selectedAQL.paramValues = selectedAQL.paramValues || {};
    Object.entries(defaults).forEach(([k, v]) => {
        if (selectedAQL.paramValues[k] === undefined || selectedAQL.paramValues[k] === "") {
        selectedAQL.paramValues[k] = v;
        }
    });
    }

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
      //const regex =new RegExp(`(?<![\\w-])(${kw})(?![\\w-])`, 'gi');
      const regex =new RegExp(`(?<![\\w-])(${kw})(?![\\w-]) `, 'gi');
      highlightedText = highlightedText.replace(regex, '<span class="datatype_keyword">$1</span> ');
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

    renderParamEditor();

    preparePostmanPayload();
  }

  function autoFormat() {
    let rawText = inputBox.value;
    rawText= rawText.replace(/\s+/g, ' ').trim();

    // Add line breaks before and after whole keywords
    let formatted = rawText.replace(
      new RegExp(`\\b(${keywords.join('|')}) \\b`, 'gi'),
      '\n$1\n\t'
    );

    formatted = formatted.replace(/, /g,",\n\t");
    formatted = formatted.replace(/,\n\t\'/g,",\'");

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
    navigator.clipboard.writeText(outputBox2.innerText)
      .then(() => alert("Cleaned AQL copied to clipboard!"))
      .catch(() => alert("Failed to copy."));
  }

  function copyPostmanOutput() {
    navigator.clipboard.writeText(outputPostman.innerText)
      .then(() => alert("Postman payload copied to clipboard!"))
      .catch(() => alert("Failed to copy."));
  }

// Debounce utility to avoid excessive saves
function debounce(func, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(func, delay);
    };
}



// EVENT LISTENERS AND STUFF THAT HAPPENS AT INTERACTIONS
//elements on change, click, etc.
document.getElementById('aqlstore').addEventListener('click', function () {
    // Clear the input value so selecting the same file again still triggers 'change'
    this.value = '';
});

document.getElementById('aqlstore').addEventListener('change', function (e) {
    
    const file = e.target.files[0];
    if (!file) return;
    selectedAQL = null;
    selectedListItem = null;
    aqlData = [];
    clearFields();

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            aqlData = JSON.parse(event.target.result);
            populateAQLList();
            document.getElementById('searchInput').value=''
        } catch (err) {
            alert("Invalid JSON file.");
        }
    };
    reader.readAsText(file);
    autoSaveToLocalStorage();
});


document.getElementById('save_aql').onclick = function () {
    refreshAqlList(true);
    populateAQLList(document.getElementById('searchInput').value);
};

document.getElementById('add_aql').onclick = function () {
    
    //document.getElementById('searchInput').value='';
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
        AQL: "",
        folderPath: "",
        paramValues: {}
    };

    aqlData.push(newEntry);
    populateAQLList( document.getElementById('searchInput').value);

    // Find new index (after sorting) and load it
    /*const newIndex = aqlData.findIndex(a => a.title === title);
    loadAQL(newIndex);*/
    let currentTitle = title;
    const newItem = aqlData.find(a => a.title === currentTitle);
    loadAQL(newItem);

    // Highlight new item
    const listItems = document.querySelectorAll('#aql_list li');
    listItems.forEach(li => {
        if (li.textContent === title) {
            if (selectedListItem) selectedListItem.classList.remove('selected');
            li.classList.add('selected');
            selectedListItem = li;
            toggleInputDisabled(false);
        }
    });
};

/*
document.getElementById('delete_aql').onclick = function () {
    //document.getElementById('searchInput').value='';
    if (selectedIndex < 0) return;
    aqlData.splice(selectedIndex, 1);
    selectedIndex = -1;
    selectedListItem = null;
    populateAQLList();
    clearFields();
    toggleInputDisabled(true);
    //triggerDownload();
};
*/
document.getElementById('delete_aql').onclick = function () {
    if (!selectedAQL) return;

    const message = `Do you really want to delete ${selectedAQL.title}?`;

    const confirmed = confirm(message);
    if (!confirmed) {
        event.preventDefault(); // Prevents the deletion if user cancels
        return;
    }
    // Remove the selected AQL from the array
    aqlData = aqlData.filter(item => item !== selectedAQL);

    // Clear selection
    selectedAQL = null;
    selectedListItem = null;

    // Clear UI
    populateAQLList(document.getElementById('searchInput').value);
    clearFields();
    toggleInputDisabled(true);

    // Optional: clear search input too
    //document.getElementById('searchInput').value = '';
};

document.getElementById('clear_storage').onclick = function () {
    if (confirm("Are you sure you want to clear all saved AQL data? This cannot be undone.")) {
        localStorage.removeItem('aqlData');
        aqlData = [];
        selectedAQL = null;
        selectedListItem = null;
        document.getElementById('aql_list').innerHTML = "";
        document.getElementById('searchInput').value = "";
        clearFields();
        alert("Local storage has been cleared.");
        updateText();
        toggleInputDisabled(true);
    }
};

// event listeners
// save collection when closing window
  /*
  window.addEventListener('beforeunload', function (e) {
    if (aqlData!=[]) {  
        triggerDownload(); // your existing function to save file
        e.preventDefault();
        e.returnValue = ''; // Required by some browsers
    }
});
*/

document.addEventListener('keydown', autoSaveToLocalStorage);
document.addEventListener('click', autoSaveToLocalStorage);
document.getElementById('searchInput').addEventListener('input', function () {
    populateAQLList(this.value);
});

document.getElementById('includeDescription').addEventListener('change', function () {
    const searchValue = document.getElementById('searchInput').value;
    populateAQLList(searchValue);
});

document.getElementById('folderPath').addEventListener('change', function(){
  populateAQLList(document.getElementById('searchInput').value);
})

let openFolderPaths = new Set(JSON.parse(localStorage.getItem("aqlOpenFolders") || "[]"));

function saveOpenFolders() {
  localStorage.setItem("aqlOpenFolders", JSON.stringify([...openFolderPaths]));
}

function captureOpenFolders() {
  openFolderPaths.clear();
  document.querySelectorAll('#aql_list details[open]').forEach(d => {
    const p = d.dataset.path;
    if (p) openFolderPaths.add(p);
  });
  saveOpenFolders();
}

function normalizeFolderPath(path) {
  if (!path) return "";
  path = path.trim();

  // Remove duplicate slashes
  path = path.replace(/\/+/g, "/");

  // Ensure trailing slash (but not leading, unless you want it)
  if (!path.endsWith("/")) path += "/";

  return path;
}


let darkTheme = 'dark';

document.getElementById("togglePanelTheme").addEventListener('click', () => {
  const btn = document.getElementById("togglePanelTheme");
  console.log('click!')
  function setPanelTheme(mode) {
    darkTheme = mode;
    // mode = 'light' or 'dark'
    const isLight = mode === "light";
    document.body.classList.toggle("panel-light", isLight);
    //btn.textContent = `${isLight ? "⚪" : "⚫"}`;
    localStorage.setItem("panelTheme", isLight ? "light" : "dark");
  }
  if (darkTheme=='dark'){
    setPanelTheme('light');
  }
  else{
    setPanelTheme('dark');  
  }

})

/*
(function () {
  const btn = document.getElementById("togglePanelTheme");
  if (!btn) return;
  console.log('button pushed')
  function setPanelTheme(mode) {
    // mode = 'light' or 'dark'
    const isLight = mode === "light";
    document.body.classList.toggle("panel-light", isLight);
    btn.textContent = `Panels: ${isLight ? "Light" : "Dark"}`;
    localStorage.setItem("panelTheme", isLight ? "light" : "dark");
  }

  // Initialize from storage or default to dark
  const stored = localStorage.getItem("panelTheme");
  if (stored === "light" || stored === "dark") {
    setPanelTheme(stored);
  } else {
    setPanelTheme("dark");
  }

  // Toggle on click
  btn.addEventListener("click", () => {
    const current = localStorage.getItem("panelTheme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    setPanelTheme(next);
  });
})();
*/