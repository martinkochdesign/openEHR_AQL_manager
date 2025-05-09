
# openEHR AQL Manager

This is a proof of concept webpage that can be used to store and format openEHR compliant AQL queries.

## Precautions

💀 Reloading the HTML page might make you loose your progress. Please save often!

⚠️ Be aware that changes to your AQL collection get saved in a new file everytime you save. Be sure to keep the last downloaded file for your next session.

## GUI overview

![GUI](pics/gui.png)

**Elements of the User Interface**

1. Button: Clear local storage
2. Button: Upload an AQL collection from a local JSON file
3. Input: AQL list is filtered by the input
4. Checkbox: Includes the description of the AQL in the filter
5. List of AQL currently in memory
6. Button: Add a new AQL to the list
7. Button: Download the whole AQL collection
8. Button: Delete the selected AQL
9. Input: Title of the selected AQL
10. Input: Description of the selected AQL
11. Button: Auto-format the AQL input field
12. Input: Editor for the AQL
13. Button: Download an image of the formatted AQL
14. Output: AQL with highlighted keywords
15. Button: Copy the cleaned up AQL to the clipboard
16. Output: Cleaned up AQL as a online text without tabs or comments


## How to use this

### Starting from scratch
### Adding an AQL
Press the "Add AQL" button to add a new AQL to the list

<img src="pics/0002.png" width="200">

You get a new empty AQL.

<img src="pics/0003.png">

Change the title, the description and finally add your AQL to the "AQL Input".

<img src="pics/0004.png">

You can format your AQL input with line breaks, spaces and tabs. 

You can use the auto-format button to enter automatically line breaks at the major keywords. 

<img src="pics/0007.png" height="150">


#### Formatted AQL
The "Formatted AQL" section shows you a version of the input AQL with keyword highlights.

<img src="pics/0006.png" height="300">

Highlighted text is:
- orange: parameters starting with "$"
- blue: ['SELECT',  'FROM', 'CONTAINS', 'WHERE', 'ORDER BY', 'LIMIT', 'OFFSET']
- red: ['VERSION','EHR', 'CONTENT_ITEM', 'ENTRY', 'CARE_ENTRY', 'EVENT', 'ITEM_STRUCTURE', 'ITEM', 'COMPOSITION', 'FOLDER', 'EHR_STATUS', 'EVENT_CONTEXT', 'SECTION', 'GENERIC_ENTRY', 'ADMIN_ENTRY', 'OBSERVATION', 'INSTRUCTION', 'ACTION', 'EVALUATION', 'ACTIVITY', 'HISTORY', 'POINT_EVENT', 'INTERVAL_EVENT', 'FEEDER_AUDIT', 'ITEM_LIST', 'ITEM_SINGLE', 'ITEM_TABLE', 'ITEM_TREE', 'CLUSTER', 'ELEMENT']
- green: ['DESC','ASC','AS','DISTINCT', 'AND', 'OR', 'NOT', 'LIKE', 'matches', 'exists', '<', '>', '=', '!', 'true', 'false', 'NULL']
- gray: in line comments that start with "//"

This view of the AQL can be exported as a PNG file. Press the snapshot button:

<img src="pics/0015.png">

Automatically the image gets downloaded as "formatted_aql.png".

Example of an image exported:
<img src="pics/formatted_aql.png">


#### Clean AQL
For many applications an AQL without line breaks, tabs or comments is needed. Therefore we present a cleaned up version in the "Clean AQL" section:
<img src="pics/0013.png">

This AQL can be copied to the clipborad by pressing the "copy to clipboard" button:

<img src="pics/0014.png">


### Delete an AQL
To delete an AQL from the collection, select the AQL you want to delete in the list on the left hand side.

Press the "Delete AQL" button to delete the AQL:

<img src="pics/0016.png" width="200">

### Changing an AQL
To modify an AQL, select the AQL you want to delete in the list on the left hand side.

When an AQL is selected you can make changes to the title, description and input.

Don't forget to save the selection after making changes.  

### Searching for an AQL
You can filter the list of AQL on the left hand side, by typing in the search bar above the list.
By default, only the AQL titles are filtered. You can select the "Include description in filter" checkbox to include also the AQL descriptions in the filter.

<img src="pics/filter.png" height="60">

### Starting with an AQL collection
Instead of starting from scratch, you can load a JSON file with an AQL collection. Use the "Select file" button to do so:

<img src="pics/0017.png" height="45">

Note that the format of the saved file has to be a list of elements that have 3 attributes: title, description and AQL:
<img src="pics/0008.png" height="120">


### Saving the AQL collection
Use the "Download AQL collection" button to download the whole AQL collection:
<img src="pics/0010.png" width="200">

The whole AQL selection gets saved in a "aql_store_file.json" file. If this file already exists, a new file with "(N)" added to the name:

<img src="pics/0011.png" width="200">

⚠️The save button does not "update" a local file selected previsously. Be sure to save the downloaded AQL collection for a future session.

The format of the saved file is a list of elements that have 3 attributes: title, description and AQL:
<img src="pics/0008.png" height="120">


### Deleting the local browser storage
The webpage uses the local storage of the web browser, so nothing gets lost when you close or reload the page. 
If you want to delete the AQL data in local storage, you can do so with the "Clear Local Storage" button:

<img src="pics/0012.png" height="30">




## License
© CatSalut. Servei Català de la Salut. Licensed under Apache 2.0. Author: Martin A. Koch, PhD.