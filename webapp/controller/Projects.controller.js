/*global history */
/*eslint-disable no-console, no-alert */
sap.ui.define([
	"com/beyondtechnologies/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/Device",
	"com/beyondtechnologies/model/formatter",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/commons/MessageBox"

], function(BaseController, JSONModel, Filter, FilterOperator, Device, formatter, MessageBox,
	MessageToast) {
	"use strict";

	return BaseController.extend("com.beyondtechnologies.controller.Projects", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the smart table controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function() {

			var oTable = this.byId("ProjectsSmartTable"),
				oViewModel = this._createViewModel(),
				// Put down smart table's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the smart table is
				// taken care of by the smart table itself.
				iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			this._oTableSelector = this.getOwnerComponent().oTableSelector;
			this.timer = null;
			this._oResourceBundle = this.getResourceBundle();
			this._oTable = oTable;
			this._oModifedEfforts = [];
			// keeps the filter and search state

			this._oViewModel = new JSONModel({
				enableCreate: false,
				delay: 0,
				busy: false,
				mode: "edit",
				viewTitle: "",
				timeoutStarted: false,
				editFieldEvent: null,
				busyIndicator: false

			});
			this.setModel(this._oViewModel, "projectsView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});

			this.getRouter().attachBypassed(this.onBypassed, this);
			this._oODataModel = this.getOwnerComponent().getModel();
			this._setInitialSortOrder();

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			this._oTable.getBinding("items").refresh();
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the smart table, that selection is removed.
		 * @public
		 */
		onBypassed: function() {
			this._oTable.removeSelections(true);
		},

		/**
		 * Event handler for the view save button. Saves the changes added by the user. 
		 * @function
		 * @public
		 */
		onSave: function(oEvent) {
			var oModel = this.getModel(),
				pendingChanges = this.getModel().getPendingChanges();

			this.getModel("projectsView").setProperty("/busy", true);

			for (var temp in pendingChanges) {
				this.getModel().setProperty("/" + temp + "/FUNC", oModel.getProperty("/" + temp + "/FUNC") + "");
				this.getModel().setProperty("/" + temp + "/TECH", oModel.getProperty("/" + temp + "/TECH") + "");
				this.getModel().setProperty("/" + temp + "/GRAND_TOTAL", oModel.getProperty("/" + temp + "/GRAND_TOTAL") + "");
			}

			oModel.submitChanges();
			this.byId("ProjectsSmartTable").setEditable(false);
		//	this._oModifedEfforts = [];
		},

		/**
		 * Event handler (attached declaratively) for the view cancel button. Cancel the changes added by the user. 
		 * @function
		 * @public
		 */
		onCancel: function() {
			var that = this;
			this.byId("ProjectsSmartTable").setEditable(false);
			this.getModel().resetChanges();
			this._oModifedEfforts.forEach(function(sPath) {
				that._editField(sPath, true);
			});
			this._oModifedEfforts = [];
			this.getModel().refresh();
		},

		/**
		 * Event handler (attached declaratively) for the view delete button. Deletes items that were selected by the user. 
		 * @function
		 * @public
		 */
		 
		onDelete: function() {
			var that = this;
			var sPath, sObjectHeaderFrice, sObjectHeaderComplexity,sQuestion,
				oViewModel = this.getModel("appView");
				this.byId("multiselectTable").getSelectedItems().forEach(function(element) {

				sPath = element.getBindingContextPath();
				sObjectHeaderFrice = element.getBindingContext().getProperty("FRICE");
	
					sObjectHeaderComplexity = element.getBindingContext().getProperty("COMPLEXITY");

				sQuestion = that._oResourceBundle.getText("deleteText", sObjectHeaderFrice + " " + sObjectHeaderComplexity);

				that._confirmDeletionByUser({
					question: sQuestion
				}, [sPath]);
			});
		},

		/**
		 * Event handler (attached declaratively) when the user edits fields in the smart table.
		 * Edits the fields that user can't edit (handles calculation)
		 * @override
		 * @public
		 */
		onEditField: function(oEvent) {
			//	this._oViewModel.setProperty("/editFieldEvent", oEvent);
			/*	var that=this,
				editedEffortPath=sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath();
			if(this._oViewModel.getProperty("/timeoutStarted")===true){
				clearTimeout(this.timer);
			}else{
				this._oViewModel.setProperty("/busyIndicator", true);
				this._oViewModel.setProperty("/timeoutStarted", true);
			}
			this.timer = setTimeout(function(){
				that._oViewModel.setProperty("/timeoutStarted", false);
		 		that._editField(editedEffortPath);
		 		that._oViewModel.setProperty("/busyIndicator", false);
	
			}, 0);
			*/

			var editedEffortPath = sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath();
			this._oModifedEfforts.push(editedEffortPath);
			this._editField(editedEffortPath, false);
		},

		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Fiori Launchpad home page
		 * @override
		 * @public
		 */
		onNavBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				// Navigate back to FLP home
				oCrossAppNavigator.toExternal({
					target: {
						shellHash: "#Shell-home"
					}
				});
			}
		},

		/**
		 * Event handler (attached declaratively) for the view save button. Asks user to confirm before saving. 
		 * @function
		 * @public
		 */
		onHandleConfirmationMessageBoxPress: function(oEvent) {
			var that = this;
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			MessageBox.confirm(
				"Voulez vous vraiment sauvegarder? Vous ne pouvez pas revenir en arrière", {
					styleClass: bCompact ? "sapUiSizeCompact" : "",
					actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
					onClose: function(sAction) {
						if (sAction === "OK") {
							that.onSave(oEvent);
						}
					}
				}
			);
		},

		/**
		 * Event handler (attached declaratively) called when the add button in the master view is pressed. it opens the create view.
		 * @public
		 */
		onAdd: function() {
			this.getModel("appView").setProperty("/addEnabled", false);
			this.getRouter().getTargets().display("createProject");
			//this.getRouter().navTo("createProject");
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Creates the model for the view
		 * @private
		 */
		_createViewModel: function() {
			return new JSONModel({
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				tableBusyDelay: 0,
				viewTitle: ""
			});
		},

		/**
		 * Groups the table items by Frice, and sorts them by Complexity
		 * @private
		 */
		_setInitialSortOrder: function() {
			var oSmartTable = this.getView().byId("ProjectsSmartTable");
			oSmartTable.applyVariant({
				group: {

					groupItems: [{
						columnKey: "FRICE"

					}]
				},
				sort: {
					sortItems: [{
						columnKey: "COMPLEXITY"
					}]
				}

			});

		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the deletion of a list of entities
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * title (optional) may be a string defining the title of the popup.
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnDeleteCanceled (optional) - called when the user decides not to perform the deletion
		 * @param {callback} fnDeleteConfirmed (optional) - called when the user decides to perform the deletion. A Promise will be passed
		 * @function
		 * @private
		 */
		/* eslint-disable */ // using more then 4 parameters for a function is justified here
		_confirmDeletionByUser: function(oConfirmation, aPaths, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnDelete = function() {
				// Calls the oData Delete service
				this._callDelete(aPaths);
			}.bind(this);

			// Opens the confirmation dialog
			MessageBox.show(oConfirmation.question, {
				icon: oConfirmation.icon || MessageBox.Icon.WARNING,
				title: oConfirmation.title || this._oResourceBundle.getText("delete"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnDelete();
					} else if (fnDeleteCanceled) {
						fnDeleteCanceled();
					}
				}
			});
		},

		/**
		 * Performs the deletion of a list of entities.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @return a Promise that will be resolved as soon as the deletion process ended successfully.
		 * @function
		 * @private
		 */
		_callDelete: function(aPaths) {
			var oViewModel = this.getModel("projectsView");
			oViewModel.setProperty("/busy", true);
			var fnFailed = function() {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function() {
				oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteOneEntity(aPaths[0], fnSuccess, fnFailed);
			this._oModifiedEfforts= this._oModifedEfforts.filter(function(element){
				return element!== aPaths[0];	
			});
		},

		/**
		 * Deletes the entity from the odata model
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnSuccess - Event handler for success operation.
		 * @param {callback} fnFailed - Event handler for failure operation.
		 * @function
		 * @private
		 */
		_deleteOneEntity: function(sPath, fnSuccess, fnFailed) {
			var oPromise = new Promise(function(fnResolve, fnReject) {
				this._oODataModel.setUseBatch(false);
				this._oODataModel.remove(sPath, {
					success: fnResolve,
					error: fnReject,
					async: true
				});
			}.bind(this));
			oPromise.then(fnSuccess, fnFailed);
			return oPromise;
		},

		/**
		 * Handles the success of updating an object
		 * @private
		 */
		_fnUpdateSuccess: function() {
			this.getModel("appView").setProperty("/busy", false);
			this.getView().unbindObject();
			this.getRouter().getTargets().display("projectDetails");
		},
		
		/**
		 * Edits all the fields that have to be calculated, and not entered by the user
		 * @private
		 */
		_editField: function(editedEffortPath, forceOriginalProperty) {
			var FS, FS_SUP, FS_REV, TS, DEV_UT, DEV_SUP, FUT, FIT_SUP, FUT_SUP, TECH_ARCH, TECH_LEAD, TECH, FUNC, GRAND_TOTAL,
				pendingChanges = this.getModel().getPendingChanges()[editedEffortPath.substr(1)],
				originalProperty = this.getModel().getOriginalProperty(editedEffortPath);
			
			if(forceOriginalProperty){
				pendingChanges=originalProperty;
			}
			if (pendingChanges.FS !== undefined) {
				FS = parseFloat(pendingChanges.FS);
			} else {
				FS = parseFloat(originalProperty.FS);
			}

			if (pendingChanges.FS_SUP !== undefined ) {
				FS_SUP = parseFloat(pendingChanges.FS_SUP);
			} else {
				FS_SUP = parseFloat(originalProperty.FS_SUP);
			}

			if (pendingChanges.FS_REV !== undefined) {
				FS_REV = parseFloat(pendingChanges.FS_REV);
			} else {
				FS_REV = parseFloat(originalProperty.FS_REV);
			}

			if (pendingChanges.TS !== undefined ) {
				TS = parseFloat(pendingChanges.TS);
			} else {
				TS = parseFloat(originalProperty.TS);
			}

			if (pendingChanges.DEV_UT !== undefined) {
				DEV_UT = parseFloat(pendingChanges.DEV_UT);
			} else {
				DEV_UT = parseFloat(originalProperty.DEV_UT);
			}

			if (pendingChanges.DEV_SUP !== undefined ) {
				DEV_SUP = parseFloat(pendingChanges.DEV_SUP);
			} else {
				DEV_SUP = parseFloat(originalProperty.DEV_SUP);
			}

			if (pendingChanges.FUT !== undefined) {
				FUT = parseFloat(pendingChanges.FUT);
			} else {
				FUT = parseFloat(originalProperty.FUT);
			}

			if (pendingChanges.FUT_SUP !== undefined) {
				FUT_SUP = parseFloat(pendingChanges.FUT_SUP);
			} else {
				FUT_SUP = parseFloat(originalProperty.FUT_SUP);
			}

			if (pendingChanges.FIT_SUP !== undefined) {
				FIT_SUP = parseFloat(pendingChanges.FIT_SUP);
			} else {
				FIT_SUP = parseFloat(originalProperty.FIT_SUP);
			}

			if (pendingChanges.TECH_ARCH !== undefined) {
				TECH_ARCH = parseFloat(pendingChanges.TECH_ARCH);
			} else {
				TECH_ARCH = parseFloat(originalProperty.TECH_ARCH);
			}

			if (pendingChanges.TECH_LEAD !== undefined) {
				TECH_LEAD = parseFloat(pendingChanges.TECH_LEAD);
			} else {
				TECH_LEAD = parseFloat(originalProperty.TECH_LEAD);
			}
			FUNC = FS + DEV_SUP + FUT;
			TECH = FS_SUP + FS_REV + TS + DEV_UT + FUT_SUP + FIT_SUP;
			GRAND_TOTAL = FUNC + TECH + TECH_ARCH + TECH_LEAD;

			// //this._oViewModel.setProperty("/busyIndicator", true);
			// that.getModel().setProperty(editedEffortPath + "/FUNC","" + FUNC);
			// that.getModel().setProperty(editedEffortPath + "/TECH", "" + TECH);
			// that.getModel().setProperty(editedEffortPath + "/GRAND_TOTAL", "" + GRAND_TOTAL);
			// //this._oViewModel.setProperty("/busyIndicator", false);

			//this code doesn't respect fiori architectural guidelines
			//However, if we use the setProperty method, it slows up the program 
			//(have to wait ~2 sec everytime the users edits a field)
			//If fiori architectural guideline have to be respected, uncomment the code above
			this.getModel().oData[editedEffortPath.substr(1)].GRAND_TOTAL = GRAND_TOTAL;
			this.getModel().oData[editedEffortPath.substr(1)].FUNC = FUNC;
			this.getModel().oData[editedEffortPath.substr(1)].TECH = TECH;

		},

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnEntityCreated: function(oData) {
			var sObjectPath = this.getModel().createKey("Projects", oData);
			this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
		}
	});
});