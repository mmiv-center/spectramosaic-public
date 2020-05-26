// Handlers for the CSV file and PNG image loading

var loaded_header = null;
var loaded_data = [];
//var loaded_data_raw = null;


// callback function when the data is loaded
function csvDataFileLoaded(evt, csv_results_file, patient_name, voxel_id, png_file, resolve) {

    var data_text = evt.target.result;

    // skip the file before column names (should always start with "PPMScale")
    data_text = data_text.slice(data_text.indexOf("PPMScale"));

    var parsed = d3.csvParse(data_text, function(d) {
        return d;
    });

    // initialize table columns
    var data_table = {};
    parsed.columns.forEach(function(column) {
        data_table[column] = [];
    });

    // copy the data into the table, convert to float
    parsed.forEach(function(row) {
        parsed.columns.forEach(function(column) {
            data_table[column].push(parseFloat(row[column]));
        });
    });

    // preprocessing -- stretch to 1024 samples (interpolate)

    data_table = preprocessLoadedData(data_table);

    //	Load the Results file and PNG
    csv_results_file.data.file(function(data_file) {

        var fileReader_data = new FileReader();
        fileReader_data.onloadend = function(evt) {
            csvResultsFileLoaded(evt, png_file, patient_name, voxel_id, data_table, resolve);
        };

        fileReader_data.readAsText(data_file);
    });

}

function csvResultsFileLoaded(evt, png_file, patient_name, voxel_id, data_table, resolve) {

    var data_text = evt.target.result;

    //	Signal amplitudes data	
    var data_sig_amp = data_text.slice(data_text.indexOf("Row"), data_text.indexOf("CRLBs") - 1);
    var parsed_sig_amp = d3.csvParse(data_sig_amp, function(d) {
        return d;
    });

    //	Standard deviations	
    var data_stdev = data_text.slice(data_text.indexOf("Row", data_text.indexOf("CRLBs")), data_text.indexOf("Fit diagnostics") - 1);
    var parsed_stdev = d3.csvParse(data_stdev, function(d) {
        return d;
    });

    //	Merge with data from "fits" file -- create a *_results property which will contain the amplitude and st. deviation and CRLB percentage
    parsed_sig_amp.columns.forEach(function(column) {

        // skip "row", "col" and "slice" props
        if (column == "Row" || column == "Col" || column == "Slice") return;

        var con = parseFloat(parsed_sig_amp[0][column]);
        var stdev = parseFloat(parsed_stdev[0][column]);

        data_table[column + "_results"] = {
            concentration: con,
            std_deviation: stdev,
            CRLB_percent: (stdev / con) * 100
        };
    });

    // load the PNG image 	
    png_file.data.file(function(image_file) {
        var fileReader_img = new FileReader();
        fileReader_img.onloadend = function(evt) {
            pngLocationImageLoaded(evt, patient_name, voxel_id, data_table, resolve);
        };

		fileReader_img.readAsDataURL(image_file); // read the image as a base-64 string
    });
}

function csvHeaderFileLoaded(evt) {
    var data_text = evt.target.result;

    var dsv = d3.dsvFormat(";");

    // parse the data
    var parsed = dsv.parse(data_text);

    loaded_header = parsed;
}

/**
 * A callback function for a FileReader.
 * 
 * The image should be read as a base-64 string (see https://stackoverflow.com/questions/6150289/how-to-convert-image-into-base64-string-using-javascript) 
 * using the FileReader.readAsDataURL method, it can then be loaded into a p5 Image object directly
 */
function pngLocationImageLoaded(evt, patient_name, voxel_id, data_table, resolve) {
	var base64_string = evt.target.result;

	var p5_img = p5_view_L.loadImage(base64_string);

    loaded_data.push({ patient: patient_name, voxel: voxel_id, data: data_table, image: p5_img });

    let percent_loaded = Math.floor((loaded_data.length / loaded_voxel_count) * 100);
    console.log("Loaded " + voxel_id + ": progress " + percent_loaded);
    p5_view_L.setMessage("Loading: " + voxel_id + " (" + percent_loaded + "%)");

    resolve();  // all loading for this voxel done -- call resolve() to update the Promise created in readVoxel
}