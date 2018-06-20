/*global history */
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
			this._oGroupSortState = new GroupSortState(oViewModel, grouper.GRAND_TOTAL(this.getResourceBundle()));
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
						if(sAction==="OK"){
							that.onSave(oEvent);
						}
					}
				}
				
			);
		},

		
		onSave: function(oEvent){
			var that=this,
				oModel=this.getModel();
				
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
        	
            sort: {
                      sortItems: [{ 
                                     columnKey: "FRICE", 
                                     operation:"Ascending"
                      }
                                 ]
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
			var oViewModel = this.getModel("projectsView"),
                sPath = oViewModel.getProperty("/sObjectPath"),
                sObjectHeader = this._oODataModel.getProperty(sPath + "/NAME"),
                sQuestion = this._oResourceBundle.getText("deleteText", sObjectHeader),
                sSuccessMessage = this._oResourceBundle.getText("deleteSuccess", sObjectHeader);

			var fnMyAfterDeleted = function() {
				oViewModel.setProperty("/busy", false);
				that.onNavBack();
				MessageToast.show(sSuccessMessage);
			};
			this._confirmDeletionByUser({
				question: sQuestion
			}, [sPath], fnMyAfterDeleted);
		},
		
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

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnEntityCreated: function(oData) {
			var sObjectPath = this.getModel().createKey("Projects", oData);
			this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
		this.getRouter().navTo("projects");
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