// Handle drag and drop operations

//var loadingData = false; this flag is now in the Vue environment -- see vue_main.js
var loaded_voxel_count = 0;

var baseline_value = 0;

// file input - CSV
function handleFileSelect(evt) {

    evt.stopPropagation();
    evt.preventDefault();

    if (app.loading_data) return;

    evt.dataTransfer = evt.originalEvent.dataTransfer;

    var files = evt.dataTransfer.items;
    var foundFiles = [];
    loaded_data = [];
    loaded_header = null;
	app.loading_data = true;
	p5_view_L.setMessage("Loading Data");
    //p5_view_L.updateScene();

    // traverse all folders, create hierarchy: all data -> patient -> voxels

    var proms = [];

	for (var i=0; i < files.length; i++) {  
		var file = files[i].webkitGetAsEntry();

		proms.push(readDirectory(foundFiles, file, ""));
	}

	// wait for everything to be processed before reading the contents
	Promise.all(proms).then(() => readData(foundFiles));
}

/**
 * Traverse the directory tree recursively, store all the content with its hierarchy in the tree variable passed as the first parameter.
 * 
 * I'm using the File and Directory Entries API, which is experimental and may not work in all the browsers, 
 * although we did not encounter any issues so far (see https://developer.mozilla.org/en-US/docs/Web/API/File_and_Directory_Entries_API).
 * 
 * I'm wrapping the callback functions in a Promise so that I can wait for the callback functions to finish before reading the data
 */
function readDirectory(tree, item, parent) {
	return new Promise((resolve, reject) => {
		var result = null;
		
		if (item.isDirectory) {
			
			result = {parentDir: parent, name: item.name, isDirectory: true, isFile: false, contents: []}
			
			var dirReader = item.createReader();

			ReadEntries(dirReader, result.contents, item.name).then(() => {		
				tree.push(result);
				resolve();
			});
			
		} else if (item.isFile) {			
			result = {parentDir: parent, name: item.name, isDirectory: false, isFile: true, data: item};
			
			tree.push(result);
			resolve();		
		}
	});
}

// Promise wrapper for the FileSystemDirectoryReader.readEntries function
function ReadEntries(dirReader, tree, parentname) {
	return new Promise ((resolve, reject) => {
		dirReader.readEntries(entries => {
			var proms = []

			entries.forEach(function(entry){
				proms.push(readDirectory(tree, entry, parentname));
			});

			// wait for the whole subtree to be resolved before resolving this node
			Promise.all(proms).then(() => resolve());
		}, function(error) {
			console.error(error);
			app.loading_data = false;
			p5_view_L.displayError("Error reading data");
		});
	});
}

/**
 * Reads the header and calls readVoxels
 * 
 * Two possible scenarios:
 * 	 	(foundFiles.length == 1) means the parent directory was dropped as a single item
 * 		(foundFiles.length > 1) means only the contents of the parent directory were dropped (i.e. foundFiles contains the header file and patient directories)
 */
function readData(foundFiles) {
	var headerFile;
	
	if (foundFiles.length == 1) {
		headerFile = foundFiles[0].contents.find(function(elem){
			return (elem.isFile && elem.name.includes("header") && elem.name.endsWith(".csv"));
		});
	} else if (foundFiles.length > 1) {		
		headerFile = foundFiles.find(function(elem){
			return (elem.isFile && elem.name.includes("header") && elem.name.endsWith(".csv"));
		});
	}
	
	if (headerFile) {
		headerFile = headerFile.data.file(function(header){
			var fileReader_header = new FileReader();
			fileReader_header.onloadend = ((evt) => { 
				csvHeaderFileLoaded(evt); 
				readVoxels(foundFiles); 
			});		
			fileReader_header.readAsText(header);
		});		
		
	} else {
		app.loading_data = false;
		p5_view_L.displayError("Header file not found");
		return;
	}
}

// To be called after the header is processed -- reads all the patient directories
function readVoxels(foundFiles) {	

	// see how many voxels are to be loaded (used just for the progress bar)
	loaded_voxel_count = 0;
	
	if (foundFiles.length == 1) {
		foundFiles[0].contents.forEach(function(patient){
			if (patient.isFile) return;
			
			patient.contents.forEach(function(voxel){
				if (voxel.isFile) return;
				
				loaded_voxel_count++;
			});
		});
		
	} else if (foundFiles.length > 1) {		
		
		foundFiles.forEach(function(patient){
			if (patient.isFile) return;
			
			patient.contents.forEach(function(voxel){
				if (voxel.isFile) return;
				
				loaded_voxel_count++;
			});
		});
	}
	
	// process patients

	var proms = [];
	
	if (foundFiles.length == 1) {
		foundFiles[0].contents.forEach(function(patient){
			if (patient.isFile) return;
			
			patient.contents.forEach(function(voxel){
				if (voxel.isFile) return;
				
				proms.push(readVoxel(patient.name, voxel.name, voxel.contents));
			});
		});
		
	} else if (foundFiles.length > 1) {		
		
		foundFiles.forEach(function(patient){
			if (patient.isFile) return;
			
			patient.contents.forEach(function(voxel){
				if (voxel.isFile) return;
				
				proms.push(readVoxel(patient.name, voxel.name, voxel.contents));
			});
		});
	}

	Promise.all(proms).then(() => {
		finishLoading();
	});
}

// Read the voxel directory -- wrap function inside a Promise, propagate the resolve function into the callbacks
function readVoxel(patient_name, voxel_id, data_files) {

	return new Promise((resolve, reject) => {
        var csv_fits_file = data_files.find(function(elem) {
            return (elem.isFile /*&& elem.name.startsWith(voxel_id) */&& elem.name.endsWith("fits.csv"));
        });

        var csv_results_file = data_files.find(function(elem) {
            return (elem.isFile /*&& elem.name.startsWith(voxel_id) */&& elem.name.endsWith("results.csv"));
        });

        var png_file = data_files.find(function(elem) {
            return (elem.isFile /*&& elem.name.startsWith(voxel_id) */&& elem.name.endsWith("ax.png"));
        });

        if (!csv_fits_file) {            
			p5_view_L.displayError("Voxel " + voxel_id + ": CSV fits file not found.");
            app.loading_data = false;
            return;
        }

        if (!csv_results_file) {
            p5_view_L.displayError("Voxel " + voxel_id + ": CSV results file not found.");
            app.loading_data = false;
            return;
        }

        if (!png_file) {
            p5_view_L.displayError("Voxel " + voxel_id + ": PNG file not found.");
            app.loading_data = false;
            return;
        }

        csv_fits_file.data.file(function(data_file) {

            var fileReader_data = new FileReader();
            fileReader_data.onloadend = function(evt) {
                csvDataFileLoaded(evt, csv_results_file, patient_name, voxel_id, png_file, resolve);
            };
            var loaded_filename = data_file.name.slice(0, -4);
            console.log("Loading: " + loaded_filename);
            fileReader_data.readAsText(data_file);
        });
	});	
}


// To be called after all data have been loaded, stores and normalizes the data
function finishLoading() {
	p5_view_L.setMessage("Finishing");
	console.log("Finishing");

    loaded_data.forEach(function(vox) {
        var header_idx = loaded_header.findIndex(function(row) {
            return (row['Voxel ID'] == vox.voxel && row['Patient'] == vox.patient);
        });

        if (header_idx == -1) { // header info not found
            p5_view_L.displayError("Header information for voxel " + vox.voxel + ", patient " + vox.patient + " not found.");
            app.loading_data = false;
            return;
        }

        var state_no = loaded_header[header_idx]['State'] == "resting" ? 0 : 1;

        addVoxel(vox.patient.replace("_", "-"),                         // patient name
            loaded_header[header_idx]['location'].replace("_", "-"),    // voxel location
            vox.voxel.replace("_", "-"),                                // voxel ID
            vox.data,                                                   // voxel data
            vox.image,                                                  // PNG with the location
            state_no,                                                   // state
            loaded_header[header_idx]['Time'].replace("_", "-"),        // timepoint 		
            loaded_header[header_idx]['Gender'].replace("_", "-"),      // gender
            loaded_header[header_idx]['Age'].replace("_", "-"),         // age	
            loaded_header[header_idx]['TE'].replace("_", "-"));         // echo time
    });

	// sort patient list
	app.patient_data.sort((a, b) => {
		return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
	});

    normalizeData();

    console.log("Data loaded");
    app.loading_data = false;
	p5_view_L.setMessage("");
    //p5_view_L.updateScene();
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer = evt.originalEvent.dataTransfer;
    evt.dataTransfer.dropEffect = 'copy';
}

$("#drop_zone").on({
    dragenter: function(evt) {
        evt.preventDefault();
    },
    dragleave: function(evt) {
        evt.preventDefault();
    },
    dragover: handleDragOver,
    drop: handleFileSelect
});