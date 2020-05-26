// This file contains all the page elements that are reactive and do not use p5: 
//      - the tab for creating custom groups
//      - metabolite selection panel
//      - data table for the right view
//      - global environment (data container) defined at the bottom of this file

// Metabolite selection component
var metab_selection_elem = Vue.component('metab-selection-elem', {
    props: {
        voxel_groups: {
            type: Array,
            required: true
        }
    },
    template: `
    <div>
        <div class="dropdown">
            <button class="btn btn-secondary btn-sm dropdown-toggle dropdown-menu-button" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="btn-metab-selection">
                    {{ chosen_group_name }}
                    </button>
            <div class="dropdown-menu group-dropdown-list" aria-labelledby="btn-metab-selection" id="dropdown-metab-selection">
                <option v-for="group in voxel_groups" class="dropdown-item group-choice-item" v-on:click="groupSelected">{{ group.name }}</option>
            </div>
        </div>

        <br>
        <p v-if="chosen_group == -1"> No group chosen </p>
        <p v-else-if="chosen_group_metabolites.length == 0"> No metabolites available </p>
        
        <div class="list-group" id="metabolite-list">
            <a v-for="metabolite in chosen_group_metabolites" href="#" class="list-group-item metabolite-item" v-on:click="metabSelected"> {{ metabolite }} </a>
        </div>

        <br>
        <p> Add all metabolites: </p>
        <button type="button" class="metab-add-btn btn btn-secondary btn-sm" v-bind:class="{ 'disabled': chosen_group_metabolites.length == 0 }" v-on:click="addMetabs('all', 'x')"> X </button>
        <button type="button" class="metab-add-btn btn btn-secondary btn-sm" v-bind:class="{ 'disabled': chosen_group_metabolites.length == 0 }" v-on:click="addMetabs('all', 'y')"> Y </button>
        <button type="button" class="metab-add-btn btn btn-secondary btn-sm" v-bind:class="{ 'disabled': chosen_group_metabolites.length == 0 }" v-on:click="addMetabs('all', 'xy')"> X + Y </button>
        <br>
        <br>
        <p> Add selected metabolites: </p>
        <button type="button" class="metab-add-btn btn btn-secondary btn-sm" v-bind:class="{ 'disabled': chosen_group_metabolites.length == 0 }" v-on:click="addMetabs('selected', 'x')"> X </button>
        <button type="button" class="metab-add-btn btn btn-secondary btn-sm" v-bind:class="{ 'disabled': chosen_group_metabolites.length == 0 }" v-on:click="addMetabs('selected', 'y')"> Y </button>
        <button type="button" class="metab-add-btn btn btn-secondary btn-sm" v-bind:class="{ 'disabled': chosen_group_metabolites.length == 0 }" v-on:click="addMetabs('selected', 'xy')"> X + Y </button>
    </div>
    `,
    data() {
        return {
            chosen_group: -1
        }
    },
    computed: {
        chosen_group_name() {
            if (this.chosen_group == -1) return "Choose group";
            return this.voxel_groups[this.chosen_group].name;
        },
        chosen_group_metabolites() {
            if (this.chosen_group == -1) return [];
            return this.voxel_groups[this.chosen_group].available_metabolites;
        }
    },
    methods: {
        // handler for the group selection (from the dropdown menu)
        groupSelected(evt) {
            var group_name = $(evt.target).val();
    
            this.chosen_group = this.voxel_groups.findIndex(function(g){
                return g.name == group_name;
            });
        }, 
        //  handler for the metabolite (de-)selection from the list
        metabSelected(evt) {
            evt.preventDefault();
            $(evt.target).toggleClass("active");
        },
        //  handler for the "add metabolites" button
        addMetabs(option, axis) {
            if (option == 'all') {
                for (var a of axis) p5_view_R.addMetabolites(a, this.chosen_group_metabolites, this.chosen_group);
            } else if (option == 'selected') {
                for (var a of axis) p5_view_R.addMetabolites(a, this.getSelectedMetabs(), this.chosen_group);
            }
        },
        //  method that returns a list of metabolites currently selected
        getSelectedMetabs() {
            var result = [];

            $(".metabolite-item").each(function(i, obj) {
                if ($(this).attr('class').includes("active")) {
                   // var elem = $(this).text();
                    result.push($(this).text().trim());
                }
            });

            return result;
        }
    }
});

// Data table for the right view
var right_data_table = Vue.component('data-table', {
    props: {
        all_voxels: {
            type: Array,
            required: true
        }
    }, 
    template: `
    <div id="right-data-table">
        <table id="right_data_table">
            <tr id="table-head">
                <th>Voxel ID</th>
                <th>Patient</th>
                <th>State</th>
                <th>Time</th>
                <th>Gender</th>
                <th>Age</th>
                <th>TE</th>
                <th>Location</th>
                <th class="groups-table-col">Groups</th>
            </tr>

            <tr v-for="voxel in all_voxels" class="tablerow" :id="voxel.vox_id" v-bind:class="{ 'table-highlighted': voxel.highlighted }">
                <td>{{ voxel.vox_id }}</td>
                <td>{{ voxel.patient }}</td>
                <td v-if="voxel.state == 0">resting</td>
                <td v-else>active</td>
                <td>{{ voxel.time }}</td>
                <td>{{ voxel.gender }}</td>
                <td>{{ voxel.age }}</td>
                <td>{{ voxel.echotime }}</td>
                <td>{{ voxel.vox_location }}</td>
                <td>{{ getCustomGroups(voxel.vox_id) }}</td>
            </tr>
        </table>
    </div>
    `,
    methods: {
        getCustomGroups(vox_id) {   // returns a string of names of custom groups that contain a voxel of given ID, separated by '; '
            var groups = "";
            app.voxel_groups.forEach(function(g) {
                if (!g.isCustom()) return; // do not display auto-generated groups
                if (g.includesVoxel(vox_id)) {
                    groups += g.name + "; ";
                }
            });

            return groups;
        }
    }
});

// Table for editing custom groups
var group_table_comp = Vue.component('group-edit-table', {
    props: {
        all_voxels: {
            type: Array,
            required: true
        },
        edited_group: {
            type: Object,
            required: true
        }
    },
    template: `
        <div id="group-data-table">
            <table id="group-data-table">
                <tr id="table-head">
                    <th>Select</th>
                    <th>Voxel ID</th>
                    <th>Patient</th>
                    <th>State</th>
                    <th>Time</th>
                    <th>TE</th>
                    <th>Location</th>
                </tr>  

                <!-- the :key attribute forces the element to redraw each time a variable is changed, see https://michaelnthiessen.com/force-re-render/ -->

                <tr v-for="voxel in all_voxels" class="tablerow" :id="voxel.vox_id" v-bind:class="{ 'table-highlighted': voxel.highlighted }">
                    <td> 
                        <div class="form-check form-check-inline" :key="voxel.vox_id + edited_group.name"> 
                            <input v-on:click="checkboxClicked" v-if="edited_group.includesVoxel(voxel.vox_id)" type="checkbox" class="form-check-input group-checkbox" :id="voxel.vox_id" checked>
                            <input v-on:click="checkboxClicked" v-else type="checkbox" class="form-check-input group-checkbox" :id="voxel.vox_id">
                        </div>
                    </td>
                    <td>{{ voxel.vox_id }}</td>
                    <td>{{ voxel.patient }}</td>
                    <td v-if="voxel.state == 0">resting</td>
                    <td v-else>active</td>
                    <td>{{ voxel.time }}</td>
                    <td>{{ voxel.echotime }}</td>
                    <td>{{ voxel.vox_location }}</td>
                </tr>
            </table>
        </div>
    `,
    methods: {
        checkboxClicked: function(evt) {
            var id = evt.target.id;
            
            if ($(evt.target).is(':checked')) {
  
                for (var voxel of this.all_voxels) {
                    if (voxel.vox_id == id) {
                        this.edited_group.addVoxel(voxel);
                        break;
                    }
                }
            } else {
                this.edited_group.removeVoxel(id);
            }

            p5_view_R.updateScene();
        }
    }
});

// Whole component for group editing
var group_edit_comp = Vue.component('group-edit-component', {
    props: {
        voxel_groups: {
            type: Array,
            required: true
        }
    },
    data() {
        return {
            edited_group: -1,
            creating_group: false,
            group_name_error: false,
            error_text: ""
        }
    },
    computed: {
        edited_group_name() {
            return this.voxel_groups[this.edited_group].name;
        },
        custom_voxel_groups() {
            var res = [];

            for (var g of this.voxel_groups) {
                if (g.custom) res.push(g);
            }

            return res;
        },
        all_voxels() {
            var result = [];

            // a group containing all voxels is the first one that is not custom (just considering the case when a user has created a group before loading any data)
            for (var g of this.voxel_groups) {
                if (g.group_idx == ALL_VOXELS_GROUP) {
                    result = g.voxels;
                    break;
                } 
                    
            }

            return result;
        }
    },
    template: `
    <div class="col">
        <div class="row" :key="voxel_groups.length">

            <!-- Button to create new custom voxel group -->
            <div class="col-4" id="create-group-col">
                <br>
                <button type="button" v-on:click="createGroup" class="btn btn-secondary btn-sm" v-bind:class="{ disabled: creating_group }"><i class="fa fa-plus"></i> Create Custom Group</button>

                <div v-if="creating_group">
                    <br><br>
                    <input id="create-group-name" class="form-control" type="text" v-bind:class="{ 'is-invalid': group_name_error }" placeholder="Group name">
                    <div v-if="group_name_error"><small class=\"text-danger\">{{ error_text }}</small><br></div>
                    <button type="button" v-on:click="createGroupConfirm" class="btn btn-secondary btn-sm" id="create-group-confirm">Create</button>
                </div>
            </div>

            <!-- Button to edit existing custom voxel group(s) -->
            <div class="col-8" id="create-group-col">
                <br>

                <!-- Click on dropdown menu button to choose existing custom group to edit membership of in custom voxel table -->
                <div class="dropdown">
                    <button type="button" class="btn btn-secondary btn-sm dropdown-toggle dropdown-menu-button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" id="btn-group-edit"><i class="fa fa-pencil"></i> Edit Custom Group</button> 
                    <ul class="dropdown-menu" id="edit-dropdown-menu">
                        <option v-for="group in custom_voxel_groups" class="dropdown-item group-choice-item" v-on:click="groupSelected">{{ group.name }}</option>
                    </ul>
                </div>
            </div>
        </div>

        <div class="row justify-content-left" id="group-edit-row">
            <div class="col" id="no-group-edit" v-if="edited_group == -1">
                <br>
                <p>No group selected</p>
            </div>
            <div class="col" id="voxels-empty" v-if="(edited_group != -1) && (all_voxels.length == 0)">
                <br>
                <p class="p-group-name">Group: {{ edited_group_name }}</p> 
                <p>No voxels available</p>
            </div>
            <div class="col" v-if="(edited_group != -1) && (all_voxels.length > 0)">
                <br>
                <p class="p-group-name">Group: {{ edited_group_name }}</p> 

                <group-edit-table :all_voxels="all_voxels" :edited_group="voxel_groups[edited_group]" :key="all_voxels.length"></group-edit-table>

            </div>
        </div>
    </div>
    `,
    methods: {
        // handler for the create group button (shows the form for group creation)
        createGroup() {
            this.creating_group = true;
            $("#group-edit-row").css('height', '68%');
        },

        // handler for the confirm button (checks validity of the name, creates the group, hides the form)
        createGroupConfirm() {
            var group_name = $("#create-group-name").val();

            var group_idx = this.voxel_groups.findIndex(function(group) {
                return group.name == group_name;
            });

            if (group_name.length == 0) {
                this.group_name_error = true;
                this.error_text = "Please specify a name";
            } else if (group_idx != -1) {
                this.group_name_error = true;
                this.error_text = "This name is already used";
            } else {
                createVoxelGroup(group_name, true);

                this.group_name_error = false;
                this.creating_group = false;
                $("#group-edit-row").css('height', '80%');
            }
        },

        // handler for group selection from the dropdown menu
        groupSelected(evt) {
            var group_name = $(evt.target).val();
    
            this.edited_group = this.voxel_groups.findIndex(function(g){
                return g.name == group_name;
            });
        }
    }
});


// Global environment, carries the data
var app = new Vue({
    el: '#main-div',
    data: {
        patient_data: [],       // contains all the data in the hierarchical structure for the left panel view - patients -> timepoints -> states -> voxels
        voxel_groups: [],       // contains all the voxel groups, data in voxel groups are held without structure as a (sorted) array, see voxel_groups.js for details
        loading_data: false
    }, 
    computed: {        
        all_voxels() {
            var result = [];

            // a group containing all voxels is the first one that is not custom (just considering the case when a user has created a group before loading any data)
            for (var g of this.voxel_groups) {
                if (g.group_idx == ALL_VOXELS_GROUP) {
                    result = g.voxels;
                    break;
                } 
            }

            return result;
        }
    }
});
