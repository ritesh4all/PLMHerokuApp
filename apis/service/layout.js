var express = require('express');
var layoutRouter = express.Router();
var path = require('path');
var fs = require('fs');

layoutRouter.post('/sobjectMetadata', function(req, res){
    var sObject = req.body.sobject;
    return res.json({
        sObjectDetails:global.sObjectFieldListConfig.sObjectFieldLabelMapping[sObject.name]
    });
});
layoutRouter.post('/sobjectDetaildata', function (req, res) {
    var slds = req.body && req.body.slds === true;
    var layout = req.body.layout;
    var sObject = req.body.sobject;
    console.log(layout);

    var SObjectLayouts = db.SObjectLayout.findOne({
        
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        },
        where: {
            SObjectId: sObject.id,
            type: req.body.type
        },
        
    });
    SObjectLayouts.then(function (sObjectLayouts) {
        console.log("SObjectLayouts123", sObjectLayouts);
        if (sObjectLayouts === undefined || sObjectLayouts === null) {
            return res.json({
                success: false,
                message: 'Error occured while loading archivals tabs.'
            });
        } else {
            return res.json({
                success: true,
                data: {
                    metadata: sObjectLayouts,
                    archivalConfigSetup: global.config.archivalConfig.ObjectSetup
                }
            });
        }
    });
});
layoutRouter.post('/metadata', function(req, res){
    var slds = req.body && req.body.slds === true;
    var layout = req.body.layout;
    var sObject = req.body.sobject;
    console.log(layout);
    var layoutMetadata = null;
    
    var sObjectDetails = db.SObject.findOne({
        attributes: {
            exclude: ['createdAt','updatedAt']
        },
        where: {
            id: sObject.id
        },
        include: {
            model: db.SObjectLayout,
            attributes: {
                exclude: ['createdAt','updatedAt']
            },
            where: {
                type :{
                   // $ne : 'Mobile'
                   $notIn : ['Mobile','Archival']
                }
            }
        }
    });
    if(layout.type === 'List'){
        layoutMetadata = db.SObjectLayoutField.findAll({
            include: [{
                model: db.SObjectField,
                attributes: {
                    exclude: ['createdAt','updatedAt']
                }
            }],
            attributes: {
                exclude: ['createdAt','updatedAt']
            },
            where: {
                SObjectLayoutId: layout.id,
                type: {
                    $in: ['Search-Criteria-Field','Search-Result-Field']
                }
            },
            order: [
                ['order']
            ]
        });
    }else if(layout.type === 'Edit' || layout.type === 'Details' || layout.type === 'Create'){
        layoutMetadata = db.SObjectLayoutSection.findAll({
            include: [{
                model: db.SObjectLayoutField,
                include: [{
                    model: db.SObjectField,
                    attributes: {
                        exclude: ['createdAt','updatedAt']
                    }
                },{
                    model: db.SObjectField,
                    as: 'ControllerSObjectField',
                    attributes: {
                        exclude: ['createdAt','updatedAt']
                    }
                }],
                attributes: {
                    exclude: ['createdAt','updatedAt']
                }
            },{
                model: db.Components,
                include: [{
                    model: db.ComponentDetail,
                    attributes: {
                        exclude: ['createdAt','updatedAt']
                    }
                }],
                attributes: {
                    exclude: ['createdAt','updatedAt']
                }
            }],
            attributes: {
                exclude: ['createdAt','updatedAt']
            },
            where: {
                SObjectLayoutId: layout.id,
                active: true
            },
            order: [
                ['order'],
                [db.SObjectLayoutField, 'order']
            ]
        });
    }else{
        return res.json({
            success: false,
            message: 'Invalid layout data!'
        });
    }
    
    layoutMetadata.then(function(resultMetadata) {
        if(resultMetadata === undefined || resultMetadata === null){
            return res.json({
                success: false,
                message: 'Error occured while loading layout metadata.'
            });
        }else{
            if(layout.type === 'Edit' || layout.type === 'Details' || layout.type === 'Create'){
                var layoutSections = JSON.parse(JSON.stringify(resultMetadata));
                layoutSections.forEach(function(section){
                    section.columns = (section.columns === 1) ? [[]] : [[],[]] ;
                    if(section.isComponent){
                        section.columns = [[]];
                        section.SObjectLayoutFields.forEach(function(field){
                            section.columns[field.column].push(field);
                        });
                    }
                    else{
                        section.SObjectLayoutFields.forEach(function(field){
                            section.columns[field.column-1].push(field);
                        });
                    }
                    delete section.SObjectLayoutFields;

                    if(section.isComponent && section.Component === null && section.ComponentId === null){
                        var fileName=section.componentName.toLowerCase().replace(/\s/g,"-");
                        staticcomponentconfig.list.forEach(function (component) {
                            if (component.name == fileName) {
                                section.Component = JSON.parse(component.config);
                            }
                        });
                      
                    }
                });

                resultMetadata = {layoutSections: layoutSections};
                
                if(layout.type !== 'Create'){
                    global.db.SObjectLayoutRelatedList.findAll({
                        include: [{
                            model: db.SObjectLayoutField,
                            include: {
                                model: db.SObjectField,
                                attributes: {
                                    exclude: ['createdAt','updatedAt']
                                }
                            },
                            attributes: {
                                exclude: ['createdAt','updatedAt']
                            }
                        },{
                            model: db.SObject,
                            include: {
                                model: db.SObjectLayout,
                                attributes: {
                                    exclude: ['createdAt','updatedAt']
                                },
                                where :{
                                     type: {
                                        $in: ['List', 'Edit']
                                    }
                                }
                            },
                            attributes: {
                                exclude: ['createdAt','updatedAt']
                            }
                        },{
                            model: db.SObjectField,
                            attributes: {
                                exclude: ['createdAt','updatedAt']
                            }
                        }],
                        attributes: {
                            exclude: ['createdAt','updatedAt']
                        },
                        where: {
                            SObjectLayoutId: layout.id,
                            active: true
                        },
                        order: [
                            ['order'],
                            [db.SObjectLayoutField, 'order']
                        ]
                    }).then(function(sObjectLayoutRelatedList){
                        if(sObjectLayoutRelatedList === undefined || sObjectLayoutRelatedList === null){
                            return res.json({
                                success: false,
                                message: 'Error occured while loading layout related list metadata.'
                            });
                        }else{
                            resultMetadata.relatedLists = sObjectLayoutRelatedList;
                            return res.json({
                                success: true,
                                data: {
                                    metadata: resultMetadata,
                                    archivalConfigSetup: global.config.archivalConfig.ObjectSetup
                                }
                            });
                        }
                    });
                }else{
                    return res.json({
                        success: true,
                        data: {
                            metadata: resultMetadata,                            
                            archivalConfigSetup: global.config.archivalConfig.ObjectSetup                        }
                    });
                }
            }else if(layout.type === 'List'){
                var fields = JSON.parse(JSON.stringify(resultMetadata));
                resultMetadata = {
                    fields: fields
                };
                sObjectDetails.then(function(_sObjectDetails){
                    if(_sObjectDetails !== undefined && _sObjectDetails !== null){
                        resultMetadata.recordactions = [];
                        resultMetadata.navbaractions = [];
                        _sObjectDetails.SObjectLayouts.forEach(function(_sObjLayout){
                            if(_sObjLayout.created && _sObjLayout.active && _sObjLayout.type !== 'List'){
                                var action = {
                                    type: 'record',
                                    label: _sObjLayout.type,
                                    icon: (_sObjLayout.type === 'Edit') ? (slds) ? 'edit' : 'pficon-edit' : (slds) ? 'preview' : 'fa fa-eye',
                                    state: 'client.' + _sObjectDetails.keyPrefix + '.' + _sObjLayout.type.toLowerCase(),
                                    btnClass: (_sObjLayout.type === 'Edit') ? 'btn btn-xs btn-primary' : 'btn btn-xs btn-default'
                                }
                                if(_sObjLayout.type === 'Create'){
                                    action.type = 'navbar',
                                    action.label = 'Create ' + _sObjectDetails.label,
                                    action.icon = (slds) ? 'add' : 'fa fa-plus',
                                    action.btnClass = (slds) ? 'slds-button--brand' :'btn btn-primary'
                                    
                                    resultMetadata.navbaractions.push(action);
                                }else{
                                    resultMetadata.recordactions.push(action);
                                }
                            }
                            else if(_sObjLayout.type === 'List'){
                                resultMetadata.btnCriteria=_sObjLayout.btnCriteria;
                                resultMetadata.whereClause=_sObjLayout.whereClause;
                            }
                        });
                    }
                    return res.json({
                        success: true,
                        data: {
                            metadata: resultMetadata,
                            namespace:global.sfdc.Namespace,
                            archivalConfigSetup: global.config.archivalConfig.ObjectSetup,                            
                        }
                    });
                });
            }
        }
    });
});

layoutRouter.post('/metadataforrelatedlistcomp', function (req, res) {
    var componentIds = req.body;
    console.log(componentIds);

    var compMetadata = db.Components.findAll({
        include: [{
            model: db.ComponentDetail,
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            }
        }, {
            model: db.SObject,
            as: 'detailSObject',
            include: {
                model: db.SObjectLayout,
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                },
                where: {
                    type: {
                        $in: ['List', 'Edit']
                    }
                }
            },
            attributes: {
                exclude: ['createdAt', 'updatedAt']
            }
        }],
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        },
        where: {
            id: {
                $in: componentIds
            }
        }
    });

    compMetadata.then(function (resultMetadata) {
        if (resultMetadata === undefined || resultMetadata === null) {
            return res.json({
                success: false,
                message: 'Error occured while fetching component metdata.'
            });
        } else {
            return res.json({
                success: true,
                data: {
                    compMetadata: resultMetadata
                }
            });
        }
    });
});

module.exports = layoutRouter;