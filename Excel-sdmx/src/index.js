/* global $, Option, Office, Excel */

'use strict';

(function () {

  $(document).ready(function () {
      
    $('.add-to-db').click( function(){
      $.ajax({
        type: "GET",
        url: $('.providers-list').val() + "/dataflow"
      }).done(function (data) {
        var $xml = $(data);
        $xml.find( 'str\\:Dataflow' ).each(function(){
          $.ajax({
            type: "POST",
            url: "datasets",
            data: { 
              datasetId: $(this).attr("id"), 
              title: $(this).find("[xml\\:lang='en']").text(),
              agencyId: $(this).attr("agencyID"), 
              provider: $(".providers-list option:selected").text(),
              dsdId: $(this).find("str\\:Structure").find('Ref').attr('id')
            }
          }).done(function (data) {
            console.log(data);
          });
        });
      });
    });
    
  });
  
})();

(function () {
    
  Office.initialize = function (reason) {
    $(document).ready( async function () {
      
      let selectedEntryPoint = '';
      let selectedProvider = '';
      let flowRefs = [];
      let selectedFlowref = '';
      let selectedAgency = '';
      let selectedDsdId = '';
      let datastructureQueryUrl = '';
      let dataQueryUrl = '';
      
      if (!Office.context.requirements.isSetSupported('ExcelApi', 1.1)) {
        $('.warning').removeClass('do-not-display');
        $('.main-inputs').css('display', 'none');
        /*
        alert('Sorry. The tutorial add-in uses Excel.js APIs that are not available in your version of Office.');
        console.log('Sorry. The tutorial add-in uses Excel.js APIs that are not available in your version of Office.');
        */
      }
      
    // Step 1. Choose a data source
      $(document).on('change', '#providers', function() {
        selectedEntryPoint = $(".providers-list").val();
        $('.search-datasets-row').removeClass('d-none');
        $('.choose-dataset-row').addClass('d-none');
        $('.dataset-query').val('');
      });
      
    // Step 2. Search datasets
      $('.get-datasets').click( async function() {
        let queryStr = $('.dataset-query').val();
        selectedProvider = $(".providers-list option:selected").text();
        //$('.choose-dataset-row').find('div').empty();
        $('.choose-dataset-row').removeClass('d-none');
        //$('.choose-dataset-row').find('div').append('<div class="ms-Dropdown" id="datasets-list" tabindex="0">' +
        //        '<label class="ms-Label">Choose a dataset</label>' +
        //        '<i class="ms-Dropdown-caretDown ms-Icon ms-Icon--ChevronDown"></i>' +
        //        '<select class="ms-Dropdown-select datasets-list">' +
        //          '<option value="" disabled selected>Select a dataset</option>' +
        //        '</select></div>');
        
        let searchUrl = '';
        if(selectedProvider === 'DBnomics') {
          searchUrl = selectedEntryPoint + '/search?q=' + queryStr + '&limit: 30';
        } else {
          searchUrl = 'datasets?queryString=' + queryStr + '&provider=' + selectedProvider;
        }
        
        let datasets = await getData(searchUrl);
        
        if(selectedProvider === 'DBnomics') {
          datasets.results.docs.forEach( dataset => {
            let o = new Option(dataset.name, dataset.code);
            o.setAttribute("data-agency-id", dataset.provider_code);
            $(".datasets-list").append(o);
          });
        } else {
          datasets.forEach( dataset => {
            let o = new Option(dataset.title, dataset.datasetId);
            o.setAttribute("data-agency-id", dataset.agencyId);
            o.setAttribute("data-dsd-id", dataset.dsdId);
            $(".datasets-list").append(o);
          });
        }
      });
      
    // Step 3. Choose a dataset and get DSDs
      $('.datasets-list').change(async function() {
        selectedFlowref = $(this).children("option:selected").val();
        selectedAgency = $(this).children("option:selected").data('agency-id');
        
        if(selectedProvider === 'DBnomics') {
          $('.main').append('<div class="ms-Grid-row"><div class="ms-Grid-col ms-sm12"><button class="ms-Button get-data"><span class="ms-Button-label">Get data</span></button></div></div>');
          return;
        } else {
          selectedDsdId = $(this).children("option:selected").data('dsd-id');
          datastructureQueryUrl = selectedEntryPoint + "/datastructure/" + selectedAgency + "/" + selectedDsdId //+ "?references=all";
        }
        
        let dsd = '';
        try {
          dsd = await getData(datastructureQueryUrl);
        } catch(e) {
          $('.main').append('<div class="row"><div class="col-12"><button class="btn btn-secondary btn-sm btn-block get-data">Get data</button></div></div>');
          return;
        }
        
        if(selectedProvider === 'DBnomics') {
          console.log(dsd.series.docs.length);
        } else {
          var $xml = $(dsd);
          $xml.find('str\\:DimensionList').find('str\\:Dimension').each(async function(){
            let dsd_id = $(this).find('str\\:LocalRepresentation').find('str\\:Enumeration').find('Ref').attr('id');
            let $codelist = '';
            if(selectedProvider === 'Eurostat') {
              $codelist = $xml.find( 'str\\:Codelist[id="' + dsd_id + '"]' );
            } else {
              let codelistUrl = selectedEntryPoint + '/codelist/' + selectedAgency + '/' + dsd_id;
              $codelist = $(await getData(codelistUrl));
            }
            let dsd_title = $codelist.children('com\\:Name').text();
            let flowrefOptions = [];
            $('.main').append('<label for="' + dsd_id + '">' + dsd_title + '</label><select class="custom-select custom-select-sm rounded-0" id="' + dsd_id + '"><option value="">All</option></select>');
            $codelist.find( 'str\\:Code' ).each( function(){
              let optionText = $(this).children('com\\:Name').text();
              let optionID = $(this).attr("id");
              flowrefOptions.push({id: optionID, text: optionText});
              let o = new Option(optionText, optionID);
              //$(o).html(optionText);
              $("#" + dsd_id).append(o);
            });
            flowRefs.push({id: dsd_id, title: dsd_title, options: flowrefOptions});
          });
          $('.main').append('<div class="row"><div class="col-12"><button class="btn btn-secondary btn-sm btn-block get-data">Get data</button></div></div>');
        }
      });
      
      // Step 4. Get data
      $(document).on('click', '.get-data', async function() {
        let key = '';
        flowRefs.forEach( function(flowRef) {
          key += $('#' + flowRef.id).val() + '.';
        });
        if((key.match(/\./g) || []).length === flowRefs.length) {
          key = 'all';
        } else {
          key = key.substring(0,key.length-1);
        }
        
        if(selectedProvider === 'DBnomics') {
          dataQueryUrl = selectedEntryPoint + "/series?provider_code=" + selectedAgency + "&dataset_code=" + selectedFlowref;
        } else if(selectedProvider === 'Widukind') {
          dataQueryUrl = selectedEntryPoint + "/" + selectedAgency + "/data/" + selectedFlowref + "/" + key;
        } else {
          dataQueryUrl = selectedEntryPoint + "/data/" + selectedFlowref + "/" + key;
        }
        
        let data = await getData(dataQueryUrl);
        
        let headers = getHeaders(data, selectedProvider, flowRefs);
        
        let noColumns = headers.length;
        
        let lastColumnLetter = getColumnLetter(noColumns);
        
        Excel.run(function(context) {
          let currentWorksheet = context.workbook.worksheets.getActiveWorksheet();
          let expensesTable = currentWorksheet.tables.add("A1:" + lastColumnLetter + "1", true /*hasHeaders*/);
          // expensesTable.name = "DataTable";
          expensesTable.getHeaderRowRange().values = [headers];
          
          if(selectedProvider === 'DBnomics') {
            processDBnomicsData(data, expensesTable, headers);
          } else {
            processSDMXData(data, expensesTable, flowRefs);
          }
          return context.sync();
        });
      });
      
      
      //================================================================================================================================
      // EXPLORE TAB
      
      $('.explore-dbnomics-spinner').removeClass('do-not-display');
      let providers = {providers: {docs: []}};
      try {
        providers = await getData('https://api.db.nomics.world/providers');
      } catch(e) {
        $('.ms-Pivot-content[data-content="shared"]').append('<span>Error while retrieving BGnomics data!</span>');
      }
      $('.explore-dbnomics-spinner').addClass('do-not-display');
      providers.providers.docs.forEach(provider => {
        $('.dbnomics-providers-list').append('<li class="list-group-item">' +
            '<div class="d-flex w-100 justify-content-between">' + 
              '<h6 class="mb-1 text-secondary" data-code="' + provider.code + '">' +  provider.name + '</h6>' +
              '<i class="fas fa-bars"></i>' +
            '</div>' +
            '<p class="mb-1">' + provider.website + ' (' + provider.region + ')' + '</p>' +
            (provider.terms_of_use ? '<small class="text-muted"><a href="' + provider.terms_of_use + '">Terms</a></small>' : '') +
          '</li>');
      });
      
      $(document).on('click', '.fa-bars', async function(){
        let selectedProviderListItem = $(this).closest('li');
        if (selectedProviderListItem.find('.list-group').length === 0) {
          let provider_categories = await getData('https://api.db.nomics.world/v21/providers/' + $(this).prev('h6').data('code'));
          selectedProviderListItem.append('<ul class="list-group dbnomics-provider-category-list">');
          provider_categories.category_tree.forEach( category => {
            selectedProviderListItem.append('<li class="list-group-item">' + category.name + '</li>');
          });
          selectedProviderListItem.append('</ul>');
        } else {
          console.log('Already retrieved');
          selectedProviderListItem.find('.list-group').toggleClass('d-none');
        }
      });
      
    });
  };
  
  let getFileSize = (url) => {
    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, true);
    xhr.setRequestHeader('Access-Control-Expose-Headers', 'Content-Length');
    xhr.onreadystatechange = function() {
      if (this.readyState == this.DONE) {
        return parseInt(xhr.getResponseHeader("Content-Length"));
      }
    };
    xhr.send();
  };
  
  let getData = async (url) => {
    try {
      let data = await $.ajax({
        type: "GET",
        url: url
      });
      return data;
    } catch(err) {
      return err;
    }
  };
  
  let getHeaders = (data, provider, flowRefs) => {
    let headers = new Set();
    if(provider === 'DBnomics') {
      data.series.data.forEach( obs => {
        for(let key in obs){
          if (obs.hasOwnProperty(key) && !(Array.isArray(obs[key]))) {
             headers.add(key);
          }
        }
        obs.period.forEach( period => headers.add(period));
      });
    } else {
      var $xml = $(data);
      flowRefs.forEach( flowref => {
        headers.add(flowref.title);
      });
      $xml.find('generic\\:Series').first().find('generic\\:ObsDimension').each( function() {
        headers.add($(this).attr('value'));
      });
    }
    return [...headers];
  };
  
  let processDBnomicsData = (data, table, headers) => {
    data.series.data.forEach( obs => {
      let excelRow = new Array(headers.length);
      for (let key in obs) {
        if (obs.hasOwnProperty(key) && !(Array.isArray(obs[key]))) {
          excelRow[headers.findIndex(elem => elem === key)] = obs[key];
        }
      }
      obs.period.forEach( (period, index) => {
        excelRow[headers.findIndex( elem => elem === period )] = obs.value[index];
      });
      table.rows.add(null, [excelRow]);
    });
    return table;
  };
  
  let processSDMXData = (data, table, flowRefs) => {
    let $xml = $(data);
    $xml.find('generic\\:Series').each( function() {
      let excelRow = [];
      $(this).find('generic\\:SeriesKey').find('generic\\:Value').each( function() {
        let optionText = flowRefs.filter(flowref => flowref.title === $(this).attr('id'));
        if(optionText.length > 0) {
          optionText = optionText[0].options.filter(option => option.id === $(this).attr('value'))[0].text;
        } else {
          optionText = $(this).attr('value');
        }
        excelRow.push(optionText);
      });
      $(this).find('generic\\:Obs').each( function(){
        excelRow.push($(this).find('generic\\:ObsValue').attr('value'));
      });
      table.rows.add(null, [excelRow]);
    });
    return table;
  };
  
  function getColumnLetter(columnPosition) {
    let positionOfFirstCharacter = Math.floor(((columnPosition-1)-26) / 676) - 1;
    let positionOfSecondCharacter = Math.floor((((columnPosition-1)-26) % 676) / 26);
    let positionOfThirdCharacter = Math.floor((columnPosition-1) % 26);
    return (positionOfFirstCharacter<0 ? '' : String.fromCharCode(97+positionOfFirstCharacter)) + 
            (positionOfSecondCharacter<0 ? '' : String.fromCharCode(97+positionOfSecondCharacter)) + 
            (positionOfThirdCharacter<0 ? '' : String.fromCharCode(97+positionOfThirdCharacter));
  }
  
})();