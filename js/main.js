var GuessMyNumberClientFramework = function(){
	var PlayerID, //La ID del jugador
		CurrentTarget, //La ID del jugador al que se le esta adivinando el numero actualmente
		PreviousTarget,
		BoardRefreshInterval, //Para actualizar el tablero automaticamente
		AttemptedNumbers = {}, //Guarda el historico de numeros intentados
		UrlServer = "http://guessmynumber.jurgens.com.ar",
		PortServer = "80",
		PlayerJSON = {};
	
	
	// Método para registrar el usuario:
    var Register = function(_Name){
		$("#divBoard").hide();
		$("#divSetNumber").hide();
		$("#divLogin").show();
		$("#divRanking").hide();
		$("#LoginResponse").html("");
        UrlServer = $("#txtServer").val();
        PortServer = $("#txtPort").val().trim();
        var Name = _Name; 
		
		// Validación del puerto y el nombre ingresados:
        if(Name.length == 0 || isNaN(PortServer) || PortServer.length == 0){
            $("#LoginResponse").html("Nombre de usuario o puerto invalido.");
            return false;
        }
		
		// Guarda la URL para registrar el usuario en una variable y hace el request AJAX:
        var Url = UrlServer + ":" + PortServer + "/players/register/" + Name;
        var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
        
		// Si el request fue exitoso:
        Request.done(function(response){
			PlayerJSON = response;
            PlayerID = response["privateUuid"]; // Variable global.
			var Msg = "<span id='welcome'>Hola, <span id='username'>" + response["name"] + "</span>!</span>"; // Mensaje de bienvenida al nuevo usuario.
			$("#upper-content").html(Msg); // Manda el mensaje en el div horizontal superior.
			$("#divLogin").hide();
			$("#divSetNumber").show();
			$("#txtNr").val(GenerateNum_4uniqueCharacters());
			$("#txtNr").focus();
        })
        
		// Si el request fue fallido:
        Request.fail(function(jqXHR, textStatus){
            if(jqXHR.status == 520)
				$("#LoginResponse").html("El usuario ya se encuentra registrado.");
            else
                $("#LoginResponse").html(jqXHR.status +  " Error desconocido.");
        })
    }
	
	// Método para setear el número elegido por el usuario:
    var SetNumber = function(){
		$("#divBoard").hide();
		$("#divSetNumber").show();
		$("#divLogin").hide();
		$("#divRanking").hide();
		
		$("#SetNumberResponse").html(""); // Borra el mensaje de error anterior.
        var Num = $("#txtNr").val(); // Guarda el número en una variable
		
		// Si el número ingresado es válido:
        if(validateNumber(Num)){
		
			// Guardo la URL para setear el número y hago el request AJAX:
            var Url = UrlServer + ":" + PortServer + "/play/setnumber/" + PlayerID + "/" + Num;
            var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
            
			// Si el request fue exitoso:
            Request.done(function(response) {
				// Mensaje de bienvenida:
				var Msg = "<span id='welcome'>Hola, <span id='username'>" + PlayerJSON["name"] + "</span>!</span> Numero seteado: " + response["number"];
                $("#upper-content").html(Msg);
				
				// Pasa a la pantalla del tablero de jugadores:
				$("#divSetNumber").hide();
				$("#divBoard").show();
				ShowBoard();
				
            });                         
        
			// Si el request fue fallido:
            Request.fail(function(jqXHR, textStatus) {
				// Verifica los códigos de error indicados en la API de GuessMyNumber:
                if(jqXHR.status == 521){
					var Msg = "Se ha reiniciado el servidor o supero el tiempo de inactividad, registrese nuevamente.";
					$("#divSetNumber").hide();
					$("#divLogin").show();
					$("#txtName").focus();
					$("#upper-content").html(Msg);
                }
                else if(jqXHR.status == 528)
                    $("#SetNumberResponse").html("El numero no es valido.");
                else if(jqXHR.status == 523)
                    $("#SetNumberResponse").html("El usuario ya tiene seteado un numero.");
                else
                    $("#SetNumberResponse").html(jqXHR.status + " Error desconocido.");
            });
			
		// En caso que el número ingresado no es válido:
        } else {
            $("#SetNumberResponse").html("Numero no valido. Debe contener 4 caracteres y todas sus cifras deben ser distintas. ");
		}
    }
	
	// Método para validar el número ingresado
    var validateNumber = function(number){
        // Comprueba que sea un número y tenga exactamente 4 dígitos:
        if (isNaN(number) || number.length < 4) return false;
        		
        // Comprueba que los 4 caracteres no se repitan:
        var ArrayNum = new Array(number.charAt(0), number.charAt(1), number.charAt(2), number.charAt(3));
        for (var i = 0; i < ArrayNum.length; i++){
            for (var j = 0; j < ArrayNum.length; j++){
                if (i != j){
                    if (ArrayNum[i] == ArrayNum[j]) return false;
                }
            }    
        }
		
		// Si el flujo de la función llegó a este punto sin retornar, significa que el número es válido:
        return true;
    }
	
	// Método para mostrar el tablero de jugadores:
	var ShowBoard = function(){
		$("#divBoard").show();
		$("#divSetNumber").hide();
		$("#divLogin").hide();
		$("#divRanking").hide();
		
		// Esconde el escudo grande y la información del jugador seleccionado anteriormente:
		$("#PlayerContainer").hide(); 	
	
		// Guarda la dirección URL para traer el tablero y hace el request AJAX:
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID;
		var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
				
		// Si el request fue exitoso:
        Request.done(function(response) {
            var UUID; // Universally unique identifier.
			
            // Dibujo la tabla de jugadores que tengan el número activado:
            for(var i in response["players"]){
			
				// Verifica que el jugador "i" tenga el número activado:
                if(response["players"][i]["numberActivated"]){
					UUID = response["players"][i]["publicUuid"]; //Guarda el publicUuid en la variable.
					
					// Agrega un span con el escudo del jugador en el div BoardContainer:
                    $("#BoardContainer").append('<span id="spn' + UUID +'">' + CreateIdenticon(UUID, "PlayerBadge") + '</span>');
                    
					// Indica que al hacer clic en el escudo, se dispare la función ShowPlayer (mostrar jugador).
					$("#img" + UUID).click(function(PublicID){
                        return function(){
                            ShowPlayer(PublicID);
                        }
                    }(UUID)) // Closure súper-archi-copado.
                }
            }   
            BoardRefreshInterval = self.setInterval(function(){ RefreshBoard(); }, 1000); // Actualiza el tablero cada 1 segundo.
			$("#txtGuess").focus(); // Pone el foco en el Input Text para adivinar números.
        });
		
		// Si el request fue fallido:
        Request.fail(function(jqXHR, textStatus) {
            
			// Verifica el error y manda el mensaje:
			if(jqXHR.status == 521) {
				$("#LoginResponse").html(jqXHR.status + ": UUID inexistente.");
            } else {
                $("#LoginResponse").html(jqXHR.status + ": Error desconocido.");
			}
			
			// Muestra la pantalla de registro nuevamente:
			$("#divBoard").hide();
			$("#divLogin").show();
			$("#txtName").focus();
        });
    }
	
	// Método para actualizar el tablero de jugadores:
    var RefreshBoard = function() {
		
		// Guarda la dirección URL para actualizar el tablero y hace el request AJAX:
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID,
			Request = $.ajax({ type: "GET", url: Url, dataType: "json" });

		// Si el request fue exitoso:
        Request.done(function(response) {
			var UUID; // Universally unique identifier.

            // Si al usuario le adivinaron el número secreto, lo manda a la pantalla para que setee otro número:
            if(response["me"][0]["numberActivated"] == false){
                window.clearInterval(BoardRefreshInterval); // Deja de actualizar el tablero.
				$("#divBoard").hide();
				$("#divSetNumber").show();
				$("#SetNumberResponse").html("Su numero ha sido adivinado. Por favor, ingrese otro para continuar.");
				$("#txtNr").focus();
                return;
            }
			
            // Redibujo el tablero con todos los jugadores activos:
            flag = false; // Variable bandera para comprobar si el número que está adivinando no fue averiguado por otra persona.
            $("#BoardContainer").html(""); // Borra el tablero viejo.
            for (var i in response["players"]){
				// Si el jugador "i" tiene número activado:
                if(response["players"][i]["numberActivated"] == true){
					UUID = response["players"][i]["publicUuid"]; // Asigna el UUID del jugador actual.
					if (UUID == CurrentTarget) flag = true // Verifica que el objetivo actual siga activo.
					
					// Agrega un span con el escudo del jugador "i":
                    $("#BoardContainer").append('<span id="spn' + UUID +'">' + CreateIdenticon(UUID, "PlayerBadge") + '</span>');
					
					// Indica que al hacer clic en el escudo, se dispare la función ShowPlayer (mostrar jugador):
                    $("#img" + UUID).click(function(PublicID){
                        return function(){
                            ShowPlayer(PublicID);
                        }
                    }(UUID)) // Closure.
                }
            }
			//$("#BoardContainer > img").attr("class", "PlayerBadge"); // Aplica a todos los escudos el estilo por defecto.
			if (flag) $("#img" + CurrentTarget).attr("class", "SelectedBadge"); // Destaca el escudo del jugador seleccionado por el usuario.

            // Si el jugador seleccionado ya no está activo, esconde su información:
            if (!flag){
                $("BoardResponse").html("Ya han adivinado el numero del jugador.");
				$("PlayerCommands").hide();
                return false;
            }	
			
			// Luego de haber mostrado el tablero, pone el foco en el Input Text para probar números:
			$("#txtGuess").focus();
        });

        // Verifica errores y, en caso de haberse producido alguno, lo manda otra vez a la pantalla de registro:
		Request.fail(function(jqXHR, textStatus) {
				
			// Deja de actualizar el tablero de jugadores: 
			window.clearInterval(BoardRefreshInterval);
			
			// Regresa a la pantalla de registro:
			$("#divBoard").hide();
			$("#divLogin").show();
			$("#txtName").focus();
			
			// Muestra el mensaje de error:
            if(jqXHR.status == 521) {
				$("#LoginResponse").html(jqXHR.status + ": Se ha reiniciado el servidor o supero el tiempo de inactividad, registrese nuevamente.");
            } else {
                $("#LoginResponse").html(jqXHR.status + ": Error desconocido.");
			}
			
        });
    }
	
	// Método para mostrar avatares Identicon:
	var CreateIdenticon = function(UUID, _class, Size){
		var ShorterUUID = UUID.substring(0, 8), // Trunca el string. // 0=comienzo // 8=longitud
			ImgURL = "http://www.gravatar.com/avatar/" + ShorterUUID + "?d=identicon&r=PG",
			ImgHTML;
		ImgURL += Size ? "&s=" + Size : "";
		ImgHTML = '<img class=' + _class + ' id=img' + UUID + ' src=' + ImgURL + '></img> ';
		return ImgHTML;
	}
	
	
	// Método para adivinar números:
	var AttemptNumber = function(){

		$("#AttemptNumberResponse").html(""); // Borra el mensaje de error anterior.
        var number = $("#txtGuess").val(); // Asigna el número ingresado.

        // Valida el número ingresado:
        if(isNaN(number) || number.length < 4){
            $("#AttemptNumberResponse").html("El numero ingresado no es valido.");
            return false;
        }
		
		// Guarda la dirección URL para adivinar números y hace el request AJAX:
        var Url = UrlServer + ":" + PortServer + "/play/guessnumber/" + PlayerID + "/" + CurrentTarget + "/" + number;
        var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
	
		// Si el request fue exitoso:
        Request.done(function(response) {
				// Fila para la tabla de números intentados:
                var NumberRow = '<tr id="' + response["numberId"] + '"><td>' + response["number"] + '</td> <td>' + response["correctChars"] + '</td><td>' + response["existingChars"] + '</td></tr>';
				
				// Muestra la tabla de intentos realizados y pone el intento actual en la primera posición:
				$("#tblNumbersGuessed").show();
				if ($("#tblNumbersGuessed tbody").html()) {
					$("#tblNumbersGuessed tbody > tr:first").before(NumberRow);
				} else {
					$("#tblNumbersGuessed tbody").append(NumberRow);
				}

                // Guarda el historial de números intentados:
				var auxJson = {"numberId": response["numberId"], "number": response["number"], "correct": response["correctChars"], "incorrect": response["wrongChars"], "exist": response["existingChars"]}
				if(AttemptedNumbers[CurrentTarget] === undefined){
                    AttemptedNumbers[CurrentTarget] = [];
                }
                AttemptedNumbers[CurrentTarget].push(auxJson);
				
                // Verifica si el número ingresado es correcto:
                if(response["correctChars"] == 4){
                    $("#AttemptNumberResponse").html("Has adivinado el numero secreto!");
                }
				
				// Retorna el foco al Input Text para seguir intentando números:
				$("#txtGuess").focus();
        });
		
		// Si el request fue fallido:    
        Request.fail(function(jqXHR, textStatus) {
            if(jqXHR.status == 521)
                $("#AttemptNumberResponse").html("No existe usuario con ese UUID.");
            else if(jqXHR.status == 524)
                $("#AttemptNumberResponse").html("No se espero el tiempo necesario.");
            else if(jqXHR.status == 525)
                $("#AttemptNumberResponse").html("Usted no tiene un numero activo.");
            else if(jqXHR.status == 529)
                $("#AttemptNumberResponse").html("Cheating.");
            else if(jqXHR.status == 526)
                $("#AttemptNumberResponse").html("El usuario no existe.");
            else if(jqXHR.status == 527)
                $("#AttemptNumberResponse").html("El usuario no tiene un numero activo.");
            else
                $("#AttemptNumberResponse").html(jqXHR.status + " Error desconocido.");
        });
    } 
	
	// Método para mostrar el historial de números intentados:
	var ShowAttempts = function(UUID) {
		$('#tblNumbersGuessed tbody > tr').remove();
		if(AttemptedNumbers[UUID] != undefined){
            for(var i = 0; i < AttemptedNumbers[UUID].length; i++){
                var Row = '<tr id="' + AttemptedNumbers[UUID][i]["numberId"] + '"><td>' + AttemptedNumbers[UUID][i]["number"] + '</td> <td>' + AttemptedNumbers[UUID][i]["correct"] + '</td><td>' + AttemptedNumbers[UUID][i]["exist"] + '</td></tr>';
                $("#tblNumbersGuessed tbody").append(Row);
            }
            if (i > 0) $("#tblNumbersGuessed").show();
        }
	}
	
	// Método disparado al seleccionar un jugador:
	var ShowPlayer = function(UUID){	
		PreviousTarget = CurrentTarget;
		CurrentTarget = UUID;
		$("#BoardContainer #img" + PreviousTarget).attr("class", "PlayerBadge"); // Aplica a todos los escudos el estilo por defecto.
		$("#img" + UUID).attr("class", "SelectedBadge"); // Destaca el escudo seleccionado.
		$("#txtGuess").val(""); // Borra el último número ingresado.
		$("#AttemptNumberResponse").html(""); // Borra el último mensaje enviado.
		$("#tblNumbersGuessed tbody").html(""); // Borra los intentos realizados.
		$("#tblNumbersGuessed").hide();
		$("#PlayerContainer").show();
		$("#PlayerCommands").show(); // Agrega los comandos para adivinar su número.	
		$("#PlayerTable").show();
		ShowAttempts(UUID); // Muestra los números intentados a este jugador anteriormente.
		$("#PlayerBadge").html(CreateIdenticon(UUID, "BigBadge", 150)); // Agranda el avatar del jugador seleccionado.
	}
	
	// Método para generar nombres de usuario aleatorios:
	var GeneratePlayerName = function(){
		var PlayerName =  "Jugador" + (Math.floor(Math.random() * (100000))).toString();
		return PlayerName;
	}
	
	// Método para mezclar un array:
	var shuffle = function(o){
		for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	};
	
	// Método para generar un string que contiene un número aleatorio de 4 cifras distintas:
	var GenerateNum_4uniqueCharacters = function(){
		var Array = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		var String = Array[0].toString();
		for (var i = 1; i < 4; i++) {
			String += Array[i].toString();
		}
		return String;
	}
		
	// Método para comprobar si el usuario tiene número seteado:
	var PlayerStatus = function(PlayerID) {
		var PStatus = "UnexistentPlayer";
		// Guarda la dirección URL para actualizar el tablero y hace el request AJAX:
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID;
		var Request = $.ajax({ type: "GET", url: Url, dataType: "json", async: false});

		// Si el request fue exitoso, evalúa si tiene número activo:
        Request.done(function(response) {
			if (response["me"][0]["numberActivated"]) { PStatus = "ActiveNumber" } else { PStatus = "UnactiveNumber" }
			return PStatus;
		});
		
		// Si el request fue fallido:
        Request.fail(function(jqXHR, textStatus) {
		
        });
		return PStatus;	
		
	}
	
	// Método para mostrar los puntajes:
	var ShowScores = function(){
	
		// Guarda la dirección URL para traer el ranking y hace el request AJAX:
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID;
		var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
		
		// Si el request fue exitoso:
        Request.done(function(response) {
			var r = response["players"]; // AJAX response.
						
            // Dibujo el ranking:
			$("#tblRanking tbody").html("");
            for(i in response["players"]){
			
				r = response["players"][i]; //Guarda el publicUuid en la variable.
				
				$("#tblRanking").append("<tr id=" + r.publicUuid + "></tr>");
				$("#tblRanking tr#" + r.publicUuid).append("<td>" + CreateIdenticon(r.publicUuid, "", 40) + "</td>");
				$("#tblRanking tr#" + r.publicUuid).append("<td>" + (r.numberActivated ? "Si" : "No") + "</td>");
				$("#tblRanking tr#" + r.publicUuid).append("<td>" + (r.score).toString() + "</td>");
			
            }
			
			$("#tblNumbersGuessed tbody > tr:first").before("<tr id=" + response["me"][0]["privateUuid"] + "></tr>");
			$("#tblRanking tr#" + response["me"][0]["privateUuid"]).append("<td>" + CreateIdenticon(response["me"][0]["privateUuid"], "", 40) + "</td>");
			$("#tblRanking tr#" + response["me"][0]["privateUuid"]).append("<td>" + (response["me"][0]["numberActivated"] ? "Si" : "No") + "</td>");
			$("#tblRanking tr#" + response["me"][0]["privateUuid"]).append("<td>" + (response["me"][0]["score"]).toString() + "</td>");
			$("#tblRanking tr#" + response["me"][0]["privateUuid"]).attr("class", "ownRow");
			
				
            //BoardRefreshInterval = self.setInterval(function(){ RefreshBoard(); }, 1000); // Actualiza el tablero cada 1 segundo.
			window.clearInterval(BoardRefreshInterval);
			$("#divBoard").hide();
			$("#divSetNumber").hide();
			$("#divLogin").hide();
			$("#divRanking").show();
        });
		
		// Si el request fue fallido:
        Request.fail(function(jqXHR, textStatus) {
            
			// Verifica el error y manda el mensaje:
			if(jqXHR.status == 521) {
				$("#LoginResponse").html(jqXHR.status + ": UUID inexistente.");
            } else {
				$("#LoginResponse").html(PlayerID ? jqXHR.status + ": Error desconocido." : "Debe registrarse para acceder a la clasificacion.");
			}
			
			// Muestra la pantalla de registro nuevamente:
			$("#divBoard").hide();
			$("#divSetNumber").hide();
			$("#divRanking").hide();
			$("#divLogin").show();
			$("#txtName").focus().val(GeneratePlayerName());
        });
    }
	
	// Método para decidir qué hacer cuando el usuario aprieta el enlace "Jugar" del menú horizontal:
	var linkPlay = function() {
		window.clearInterval(BoardRefreshInterval);
		$("#divBoard").hide();
		$("#divSetNumber").hide();
		$("#divLogin").hide();
		$("#divRanking").hide();
		$("#LoginResponse").html("");
		switch (PlayerStatus(PlayerID)) {
		case "ActiveNumber":
			ShowBoard();
			ShowPlayer(CurrentTarget);
			break;
		case "UnactiveNumber":
			$("#divSetNumber").show();
			$("#txtNr").val(GenerateNum_4uniqueCharacters()).focus();
			break;
		case "UnexistentPlayer":
			$("#divLogin").show();
			$("#txtName").val(GeneratePlayerName()).focus();
			break;
		}
	}
	
	// Método para enviar formularios apretando Enter:
	var SetIntroShortcut = function(element, method) {
		$(element).keypress(function(event){
			var keyPressed = (event.keyCode ? event.keyCode : event.which);
			if (keyPressed == '13') method();
		});
	}
	
	// Retorna los métodos siguientes, transformándolos en métodos públicos:
	return {
        "Register": function(_Name) { Register(_Name); },
        "SetNumber": function() { SetNumber(); },
        "AttemptNumber": function() { AttemptNumber(); },
		"GeneratePlayerName": function() { return GeneratePlayerName(); },
		"GenerateNum_4uniqueCharacters": function() { GenerateNum_4uniqueCharacters(); },
		"Play": function() { linkPlay(); },
		"SetIntroShortcut": function(element, method) { SetIntroShortcut(element, method); },
		"ShowScores": function() { ShowScores(); }
    }
}