(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      // code: {
                      //   $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                      //         'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                      //         'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      // }
                      category: {
                        $or: ['vital-signs']
                      }
                    }
                  });
        var appts = smart.patient.api.fetchAll({
          type: 'Appointment',
          query: {
              date: 'ge2017-01-01',
              patient: patient.id,
          }
      });
       /* var immunizations = smart.patient.api.fetchAll({
            type: 'Immunization'
        });

        console.log('Immunizations' + immunizations);*/

        $.when(pt, appts).fail(onError);

        $.when(pt, appts).done(function(patient, appts) {
          console.log(patient);
          console.log("Appts: ", appts);
          //var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;

          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          // //var height = byCodes('8302-2');
          // var height = byCodes('3137-7');
          // var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          // var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          // var hdl = byCodes('2085-9');
          // var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          // p.height = getQuantityValueAndUnit(height[0]);

          // if (typeof systolicbp != 'undefined')  {
          //   p.systolicbp = systolicbp;
          // }

          // if (typeof diastolicbp != 'undefined') {
          //   p.diastolicbp = diastolicbp;
          // }

          // p.hdl = getQuantityValueAndUnit(hdl[0]);
          // p.ldl = getQuantityValueAndUnit(ldl[0]);


          var parsedAppts = parseAppts(appts);
          console.log('Parsed Appointments: ', parsedAppts);

          p.appointments = parsedAppts;

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      appointments: {value: []},
    };
  }

  function defaultAppt(){
    return {
      description: {value: ''},
      place: {value: ''},
      date_time: {value: ''},
    };
  }

  function parsePlace(participants) {
    var place = '';

    participants.some(function(participant){
      if(participant.actor !== undefined) {
        var actor = participant.actor;
        if(actor.reference !== undefined) {
          if(actor.reference.split('\/')[0] === 'Location') {
            place = actor.display;
            return true;
          }
        }
      }
      return false;
    });
    return place;
  }

  function parseAppts(appointments) {
    var parsedAppts = appointments.map(appt => {
      var parsedAppt = defaultAppt();
      parsedAppt.description = appt.description;
      parsedAppt.place = parsePlace(appt.participant);
      parsedAppt.date_time = appt.start;

      return parsedAppt;
    });

    return parsedAppts
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  function makePrettyAppts(appts) {
    var thing = $('<table>');
    thing.append('<tr><th>Description</th><th>Date &amp; Time</th><th>Place</th></tr>');

    appts.forEach(function(appt) {
      var tr = $('<tr>');
      ['description', 'date_time', 'place' ].forEach(function(attr) {
        tr.append('<td>' + appt[attr] + '</td>')
      });
      thing.append(tr);
    });

    return thing;

  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    //$('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    //$('#ldl').html(p.ldl);
    //$('#hdl').html(p.hdl);
    $('#appointments').html(makePrettyAppts(p.appointments));
  };

})(window);
