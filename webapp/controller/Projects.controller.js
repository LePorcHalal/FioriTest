/*global history */
/*eslint-disable no-console, no-alert */
sap.ui.define([
	"com/beyondtechnologies/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"com/beyondtechnologies/model/formatter",
	"sap/m/MessageBox",
	"com/beyondtechnologies/model/grouper",
	"com/beyondtechnologies/model/GroupSortState",
	"sap/m/MessageToast",
	"sap/ui/commons/MessageBox"

], function(BaseController, JSONModel, Filter, FilterOperator, GroupHeaderListItem, Device, formatter, MessageBox, grouper,
	GroupSortState, MessageToast) {
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
		//	this._oGroupSortState = new GroupSortState(oViewModel, grouper.GRAND_TOTAL(this.getResourceBundle()));
			this._oResourceBundle = this.getResourceBundle();
			this._oTable = oTable;
			// keeps the filter and search state

			this._oViewModel = new JSONModel({
				enableCreate: false,
				delay: 0,
				busy: false,
				mode: "edit",
				viewTitle: ""
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
			this.setInitialSortOrder();

		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * smart table counter and hides the pull to refresh control, if
		 * necessary.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function(oEvent) {
			// hide pull to refresh if necessary
			this.byId("pullToRefresh").hide();
			this._findItem();
			this.getModel("appView").setProperty("/addEnabled", true);
		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function() {
			this._oTable.getBinding("items").refresh();
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function(oEvent) {
			var that = this;
			var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var fnLeave = function() {
				that._oODataModel.resetChanges();
				that._showDetail(oItem);
			};
			if (this._oODataModel.hasPendingChanges()) {
				this._leaveEditPage(fnLeave);
			} else {
				this._showDetail(oItem);
			}
			that.getModel("appView").setProperty("/addEnabled", true);
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the smart table, that selection is removed.
		 * @public
		 */
		onBypassed: function() {
			this._oTable.removeSelections(true);
		},

		handleConfirmationMessageBoxPress: function(oEvent) {
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

		onSave: function(oEvent) {
			var that = this,
				oModel = this.getModel();

			this.getModel("projectsView").setProperty("/busy", true);
			if (this._oViewModel.getProperty("/mode") === "edit") {
				// attach to the request completed event of the batch
				oModel.attachEventOnce("batchRequestCompleted", function(oEvent) {
					if (that._checkIfBatchRequestSucceeded(oEvent)) {
						that._fnUpdateSuccess();
					} else {
						that._fnEntityCreationFailed();
						MessageBox.error(that._oResourceBundle.getText("updateError"));
					}
				});

			}
			oModel.submitChanges();
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

		setInitialSortOrder: function() {
			var oSmartTable = this.getView().byId("ProjectsSmartTable");
			oSmartTable.applyVariant({
				
				group:{
			
					groupItems:[{
						columnKey: "FRICE"
						
					}]
				},
				sort:{
					sortItems:[{
						columnKey:"COMPLEXITY"
					}]
				}
				 
				
			});

		},

		/**
		 * Event handler  (attached declaratively) called when the add button in the master view is pressed. it opens the create view.
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
				//isFilterBarVisible: false,
				//filterBarLabel: "",
				//delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				//noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				//tableNoDataText: this.getResourceBundle().getText("masterListNoDataText"),
				//sortBy: "ComplexityID",
				//groupBy: "NONE",
				tableBusyDelay: 0,
				// enableCreate: false,
				// delay: 0,
				// busy: false,
				// mode: "edit",
				viewTitle: ""

				// shareOnJamTitle: this.getResourceBundle().getText("projectsTitle"),
				// shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailProjectsSubject"),
				// shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailProjectsMessage", [location.href])
			});
		},

		/**
		 * Ask for user confirmation to leave the edit page and discard all changes
		 * @param {object} fnLeave - handles discard changes
		 * @param {object} fnLeaveCancelled - handles cancel
		 * @private
		 */
		_leaveEditPage: function(fnLeave, fnLeaveCancelled) {
			var sQuestion = this.getResourceBundle().getText("warningConfirm");
			var sTitle = this.getResourceBundle().getText("warning");

			MessageBox.show(sQuestion, {
				icon: MessageBox.Icon.WARNING,
				title: sTitle,
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function(oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnLeave();
					} else if (fnLeaveCancelled) {
						fnLeaveCancelled();
					}
				}
			});
		},

		_checkIfBatchRequestSucceeded: function(oEvent) {
			var oParams = oEvent.getParameters();
			var aRequests = oEvent.getParameters().requests;
			var oRequest;
			if (oParams.success) {
				if (aRequests) {
					for (var i = 0; i < aRequests.length; i++) {
						oRequest = oEvent.getParameters().requests[i];
						if (!oRequest.success) {
							return false;
						}
					}
				}
				return true;
			} else {
				return false;
			}
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function(oItem) {
			//var bReplace = !Device.system.phone;
			this.getRouter().navTo("projectDetails", {
				ID: encodeURIComponent(oItem.getBindingContext().getProperty("ID"))
			});
		},

		/**
		 * Internal helper method that adds "/" to the item's path 
		 * @private
		 */
		_fnGetPathWithSlash: function(sPath) {
			return (sPath.indexOf("/") === 0 ? "" : "/") + sPath;
		},

		onDelete: function() {
			var that = this;
			var sPath, sObjectHeader, sQuestion, sSuccessMessage,
				oViewModel = this.getModel("appView");
			this.byId("multiselectTable").getSelectedItems().forEach(function(element) {

				sPath = element.getBindingContextPath();
				sObjectHeader = element.getBindingContext().getProperty("FRICE");
				sQuestion = that._oResourceBundle.getText("deleteText", sObjectHeader);
				sSuccessMessage = that._oResourceBundle.getText("deleteSuccess", sObjectHeader);

				var fnMyAfterDeleted = function() {
					oViewModel.setProperty("/busy", false);
					MessageToast.show(sSuccessMessage);
				};
				that._confirmDeletionByUser({
					question: sQuestion
				}, [sPath], fnMyAfterDeleted);
			});

		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the deletion of a list of entities
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * title (optional) may be a string defining the title of the popup.
		 * @param {object} oConfirmation - Possesses up to two attributes: question (obligatory) is a string providing the statement presented to the user.
		 * @param {array} aPaths -  Array of strings representing the context paths to the entities to be deleted. Currently only one is supported.
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @param {callback} fnDeleteCanceled (optional) - called when the user decides not to perform the deletion
		 * @param {callback} fnDeleteConfirmed (optional) - called when the user decides to perform the deletion. A Promise will be passed
		 * @function
		 * @private
		 */
		/* eslint-disable */ // using more then 4 parameters for a function is justified here
		_confirmDeletionByUser: function(oConfirmation, aPaths, fnAfterDeleted, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnDelete = function() {
				// Calls the oData Delete service
				this._callDelete(aPaths, fnAfterDeleted);
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
		 * @param {callback} fnAfterDeleted (optional) - called after deletion is done. 
		 * @return a Promise that will be resolved as soon as the deletion process ended successfully.
		 * @function
		 * @private
		 */
		_callDelete: function(aPaths, fnAfterDeleted) {
			var oViewModel = this.getModel("projectsView");
			oViewModel.setProperty("/busy", true);
			var fnFailed = function() {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function() {
				if (fnAfterDeleted) {
					fnAfterDeleted();
					this._oODataModel.setUseBatch(true);
				}
				oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteOneEntity(aPaths[0], fnSuccess, fnFailed);
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
		 * It navigates to the saved itemToSelect item. After delete it navigate to the next item. 
		 * After add it navigates to the new added item if it is displayed in the tree. If not it navigates to the first item.
		 * @private
		 */
		_findItem: function() {
			var itemToSelect = this.getModel("appView").getProperty("/itemToSelect");
			if (itemToSelect) {
				var sPath = this._fnGetPathWithSlash(itemToSelect);
				var oItem = this._oTableSelector.findListItem(sPath);
				if (!oItem) { //item is not viewable in the tree. not in the current tree page.
					oItem = this._oTableSelector.findFirstItem();
					if (oItem) {
						sPath = oItem.getBindingContext().getPath();
					} else {
						this.getRouter().getTargets().display("detailNoObjectsAvailable");
						return;
					}
				}
				this._oTableSelector.selectAListItem(sPath);
				this._showDetail(oItem);
			}
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
		
		functionTest: function(func){
			setTimeout(func(), 0);

		},
		
	
		
		onEditField: function(oEvent){
			console.log("max");
			var FS, FS_SUP, FS_REV, TS, DEV_UT, DEV_SUP, FUT, FIT_SUP, FUT_SUP, TECH_ARCH, TECH_LEAD, TECH, FUNC, GRAND_TOTAL,
				pendingChanges = this.getModel().getPendingChanges()[sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath().substr(1)],
				 originalProperty=this.getModel().getOriginalProperty(sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath());
			if(pendingChanges.FS!==undefined){
				FS=parseFloat(pendingChanges.FS);
			}else{
				FS=parseFloat(originalProperty.FS);
			}
			
			if(pendingChanges.FS_SUP!==undefined){
				FS_SUP=parseFloat(pendingChanges.FS_SUP);
			}else{
				FS_SUP=parseFloat(originalProperty.FS_SUP);
			}
			
			if(pendingChanges.FS_REV!==undefined){
				FS_REV=parseFloat(pendingChanges.FS_REV);
			}else{
				FS_REV=parseFloat(originalProperty.FS_REV);
			}
			
			if(pendingChanges.TS!==undefined){
				TS=parseFloat(pendingChanges.TS);
			}else{
				TS=parseFloat(originalProperty.TS);
			}
			
			if(pendingChanges.DEV_UT!==undefined){
				DEV_UT=parseFloat(pendingChanges.DEV_UT);
			}else{
				DEV_UT=parseFloat(originalProperty.DEV_UT);
			}
		
			if(pendingChanges.DEV_SUP!==undefined){
				DEV_SUP=parseFloat(pendingChanges.DEV_SUP);
			}else{
				DEV_SUP=parseFloat(originalProperty.DEV_SUP);
			}
		
			if(pendingChanges.FUT!==undefined){
				FUT=parseFloat(pendingChanges.FUT);
			}else{
				FUT=parseFloat(originalProperty.FUT);
			}
			
			if(pendingChanges.FUT_SUP!==undefined){
				FUT_SUP=parseFloat(pendingChanges.FUT_SUP);
			}else{
				FUT_SUP=parseFloat(originalProperty.FUT_SUP);
			}
			
			if(pendingChanges.FIT_SUP!==undefined){
				FIT_SUP=parseFloat(pendingChanges.FIT_SUP);
			}else{
				FIT_SUP=parseFloat(originalProperty.FIT_SUP);
			}
			
			if(pendingChanges.TECH_ARCH!==undefined){
				TECH_ARCH=parseFloat(pendingChanges.TECH_ARCH);
			}else{
				TECH_ARCH=parseFloat(originalProperty.TECH_ARCH);
			}
			
			if(pendingChanges.TECH_LEAD!==undefined){
				TECH_LEAD=parseFloat(pendingChanges.TECH_LEAD);
			}else{
				TECH_LEAD=parseFloat(originalProperty.TECH_LEAD);
			}
			FUNC= FS+DEV_SUP+FUT;
			TECH=FS_SUP+FS_REV+TS+DEV_UT+FUT_SUP+FIT_SUP;
			GRAND_TOTAL=FUNC+TECH+TECH_ARCH+TECH_LEAD;
			var that=this;
			
			this.functionTest(function(){
		
				that.getModel().setProperty(sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath()+"/FUNC",FUNC);
		
				that.getModel().setProperty(sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath()+"/TECH", TECH);
		
			});
			
	//		this.getModel().setProperty(sap.ui.getCore().byId(oEvent.getParameter("changeEvent").getParameter("id")).getBindingContext().getPath()+"/GRAND_TOTAL",);
			
			
			
			
			
			
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

			this.getRouter().navTo("projectDetails", {
				ID: encodeURIComponent(oData.ID)
			});

		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
		_fnEntityCreationFailed: function() {
			this.getModel("appView").setProperty("/busy", false);
		},

		/**
		 * Handles the onDisplay event which is triggered when this view is displayed 
		 * @param {sap.ui.base.Event} oEvent the on display event
		 * @private
		 */
		_onDisplay: function(oEvent) {
			var oData = oEvent.getParameter("data");
			if (oData && oData.mode === "update") {
				this._onEdit(oEvent);
			} else {
				this._onCreate(oEvent);
			}
		},

		/**
		 * Gets the form fields
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @private
		 */
		_getFormFields: function(oSimpleForm) {
			var aControls = [];
			var aFormContent = oSimpleForm.getContent();
			var sControlType;
			for (var i = 0; i < aFormContent.length; i++) {
				sControlType = aFormContent[i].getMetadata().getName();
				if (sControlType === "sap.m.Input" || sControlType === "sap.m.DateTimeInput" ||
					sControlType === "sap.m.CheckBox") {
					aControls.push({
						control: aFormContent[i],
						required: aFormContent[i - 1].getRequired && aFormContent[i - 1].getRequired()
					});
				}
			}
			return aControls;
		}

	});
});