var GuessMyNumberClientFramework = function(){
	var PlayerID, //La ID del jugador
		CurrentTarget, //La ID del jugador al que se le esta adivinando el numero actualmente
		BoardRefreshInterval, //Para actualizar el tablero automaticamente
		AttemptedNumbers = {}, //Guarda el historico de numeros intentados
		UrlServer,
		PortServer,
		PlayerJSON = {};
	
	
	// Metodo para registrar el usuario
    var Register = function(){
		$("#LoginResponse").html("");
        UrlServer = $("#txtServer").val();
        PortServer = $("#txtPort").val().trim();
        var Name = $("#txtName").val().trim(); 

        if(Name.length == 0 || isNaN(PortServer) || PortServer.length == 0){
            $("#LoginResponse").html("Nombre de usuario o puerto invalido.");
            return false;
        }
		
        var Url = UrlServer + ":" + PortServer + "/players/register/" + Name;
        var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
        
        Request.done(function(response){
			PlayerJSON = response;
            PlayerID = response["privateUuid"]; //variable global
			var Msg = "<span id='welcome'>Hola, <span id='username'>" + response["name"] + "</span>!</span>"; //mensaje de bienvenida al nuevo usuario
			$("#upper-content").html(Msg); //mando el mensaje en el div horizontal superior
			$("#divLogin").hide();
			$("#divSetNumber").show();
			$("#txtNr").val(GenerateNum_4uniqueCharacters());
			$("#txtNr").focus();
        })
        
        Request.fail(function(jqXHR, textStatus){
            if(jqXHR.status == 520)
				$("#LoginResponse").html("El usuario ya se encuentra registrado.");
            else
                $("#LoginResponse").html(jqXHR.status +  " Error desconocido.");
        })
    }
	
	// Metodo para cargar el numero al usuario
    var SetNumber = function(){
		$("#SetNumberResponse").html("");
        var Num = $("#txtNr").val();    

        if(validateNumber(Num) != false){
            var Url = UrlServer + ":" + PortServer + "/play/setnumber/" + PlayerID + "/" + Num;
            var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });
            
            Request.done(function(response) { 
				var Msg = "<span id='welcome'>Hola, <span id='username'>" + PlayerJSON["name"] + "</span>!</span> Numero seteado: " + response["number"];
                $("#upper-content").html(Msg);
				$("#divSetNumber").hide();
				$("#divBoard").show();
				ShowBoard();
				
            });                         
        
            Request.fail(function(jqXHR, textStatus) {
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
        } else {
            $("#SetNumberResponse").html("Numero no valido. Debe contener 4 caracteres y todas sus cifras deben ser distintas. ");
		}
    }
	
	// Metodo para validar el numero ingresado
    var validateNumber = function(number){
        // Compruebo que sea un numero y tenga 4 digitos
        if (isNaN(number) || number.length < 4) return false;
        		
        // Compruebo que no se repitan
        var ArrayNum = new Array(number.charAt(0), number.charAt(1), number.charAt(2), number.charAt(3));
        for (var i = 0; i < ArrayNum.length; i++){
            for (var j = 0; j < ArrayNum.length; j++){
                if (i != j){
                    if (ArrayNum[i] == ArrayNum[j]) return false;
                }
            }    
        }
		
		// Si llego hasta aqui, el numero es valido
        return true;
    }
	
	//Metodo para mostrar el tablero de jugadores
	var ShowBoard = function(){        
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID,
			Request = $.ajax({ type: "GET", url: Url, dataType: "json" });

        Request.done(function(response) {
            var TableRow, // Fila del tablero de jugadores
				UUID; // Universally unique identifier
			
            // Dibujo la tabla de jugadores con numero activado
            for(var i in response["players"]){
                if(response["players"][i]["numberActivated"] == true){
					UUID = response["players"][i]["publicUuid"];
                    
                    $("#BoardContainer").append('<span id="spn' + UUID +'">' + CreateIdenticon(UUID) + '</span>');
                    $("#img" + UUID).click(function(PublicID){
                        return function(){
                            ShowPlayer(PublicID);
                        }
                    }(UUID)) // Closure super archi copado
                }
            }   
            BoardRefreshInterval = self.setInterval(function(){ RefreshBoard(); }, 1000); //Actualiza el tablero cada 1 segundo
        })
    
        Request.fail(function(jqXHR, textStatus) {
            if(jqXHR.status == 521) {
				$("#LoginResponse").html(jqXHR.status + ": UUID inexistente.");
            } else {
                $("#LoginResponse").html(jqXHR.status + ": Error desconocido.");
			}
			$("#divBoard").hide();
			$("#divLogin").show();
			$("#txtName").focus();
        });
		$("#txtGuess").focus();
    }
	
	// Metodo para actualizar el tablero de jugadores
    var RefreshBoard = function ()
    {
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID,
			Request = $.ajax({ type: "GET", url: Url, dataType: "json" });

        Request.done(function(response) {
            var TableRow, // Fila del tablero de jugadores
				UUID; // Universally unique identifier

            // Verifico que no me hayan adivinado el numero, en caso de error lo mando a la pantalla para que setee el numero nuevamente
            if(response["me"][0]["numberActivated"] == false){
                window.clearInterval(BoardRefreshInterval); // Dejo de actualizar el tablero
				$("#divBoard").hide();
				$("#divSetNumber").show();
				$("#SetNumberResponse").html("Su numero ha sido adivinado. Por favor, ingrese otro para continuar.");
				$("#txtNr").focus();
                return;
            }
			
            // Redibujo la tabla con todos los jugadores activos
            flag = false;
            $("#BoardContainer").html("");
            for (var i in response["players"]){
                if(response["players"][i]["numberActivated"] == true){
					UUID = response["players"][i]["publicUuid"]; // Asigno el UUID del jugador actual
					if (UUID == CurrentTarget) flag = true // Comparo que el objetivo actual siga activo
                    $("#BoardContainer").append('<span id="spn' + UUID +'">' + CreateIdenticon(UUID) + '</span>');
                    $("#img" + UUID).click(function(PublicID){
                        return function(){
                            ShowPlayer(PublicID);
                        }
                    }(UUID)) //Closure super archi copado
                }
            }
			$("#PlayerBadge > img").attr("class", "PlayerBadge"); // Aplico a todos los escudos el estilo por defecto
			if (flag) $("#img" + CurrentTarget).attr("class", "SelectedBadge"); // Destaco el escudo seleccionado

            // Verifico que el jugador este en la lista de activos
            if (!flag){
                $("BoardResponse").html("Ya han adivinado el numero del jugador.");
				$("PlayerCommands").hide();
                return false;
            }			
        })

        // Verifico errores y en caso de producirse lo mando otra vez a la pantalla de registro
		Request.fail(function(jqXHR, textStatus) {
	
			// Muestro el mensaje de error en la pantalla de login.
            if(jqXHR.status == 521) {
				$("#LoginResponse").html(jqXHR.status + ": Se ha reiniciado el servidor o supero el tiempo de inactividad, registrese nuevamente.");
            } else {
                $("#LoginResponse").html(jqXHR.status + ": Error desconocido.");
			}
			
			// Doy de baja el refresh a la tabla de jugadores.
			window.clearInterval(BoardRefreshInterval);
			
			// Muestro las <div> correspondientes.
			$("#divBoard").hide();
			$("#divLogin").show();
			$("#txtName").focus();
			
        });
		$("#txtGuess").focus();
    }
	
	// Metodo para mostrar avatares identicon
	var CreateIdenticon = function(UUID, Size){
		var ShorterUUID = UUID.substring(0, 8), // Trunca el string // 0=comienzo // 8=longitud
			_Size = "&s=" + Size,
			ImgURL = "http://www.gravatar.com/avatar/" + ShorterUUID + "?d=identicon&r=PG",
			ImgHTML;
		ImgURL += Size ? _Size : "";
		ImgHTML = '<img class="PlayerBadge" id=img' + UUID + ' src=' + ImgURL + '></img> ';
		return ImgHTML;
	}
	
	
	// Metodo para adivinar numeros.
	var AttemptNumber = function(){
		$("#AttemptNumberResponse").html("");
        var number = $("#txtGuess").val();  

        // Valido numero ingresado por el usuario
        if(isNaN(number) || number.length < 4){
            $("#AttemptNumberResponse").html("El numero ingresado no es valido.");
            return false;
        }

        var Url = UrlServer + ":" + PortServer + "/play/guessnumber/" + PlayerID + "/" + CurrentTarget + "/" + number;
        var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });

        Request.done(function(response) {
                var NumberRow = '<tr id="' + response["numberId"] + '"><td>' + response["number"] + '</td> <td>' + response["correctChars"] + '</td><td>' + response["existingChars"] + '</td></tr>';
				
				$("#tblNumbersGuessed").show();
				if ($("#tblNumbersGuessed tbody").html()) {
					$("#tblNumbersGuessed tbody > tr:first").before(NumberRow);
				} else {
					$("#tblNumbersGuessed tbody").append(NumberRow);
				}

                // Guardo el historico de numeros intentados
				var auxJson = {"numberId": response["numberId"], "number": response["number"], "correct": response["correctChars"], "incorrect": response["wrongChars"], "exist": response["existingChars"]}
				if(AttemptedNumbers[CurrentTarget] === undefined){
                    AttemptedNumbers[CurrentTarget] = [];
                }
                AttemptedNumbers[CurrentTarget].push(auxJson);
				
                // Compruebo si el numero ingresado es el correcto
                if(response["correctChars"] == 4){
                    $("#AttemptNumberResponse").html("Has adivinado el numero secreto!");
                }
        })
    
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
		$("#txtGuess").focus();
    } 
	
	// Metodo para mostrar los intentos de adivinacion realizados
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
	
	// Metodo disparado al seleccionar un jugador
	var ShowPlayer = function(UUID){		
		CurrentTarget = UUID;
		$("#PlayerBadge").html(CreateIdenticon(UUID, 150)); // Agranda el avatar del jugador seleccionado
		$("#PlayerCommands").show(); // Agrega los comandos para adivinar su numero	
		$("#PlayerTable").show();
		$("#txtGuess").val(""); // Borra el ultimo numero ingresado
		$("#AttemptNumberResponse").html(""); // Borra el ultimo mensaje enviado
		$("#tblNumbersGuessed tbody").html(""); // Borra los intentos realizados
		$("#tblNumbersGuessed").hide();
		//$("#img" + UUID).attr("style", "color: red");
		$("#PlayerBadge > img").attr("class", "PlayerBadge"); // Aplico a todos los escudos el estilo por defecto
		$("#img" + UUID).attr("class", "SelectedBadge"); // Destaco el escudo seleccionado
		ShowAttempts(UUID); // Muestra los intentos realizados a este jugador anteriormente
	}
	
	// Metodo para generar nombres aleatorios
	var GeneratePlayerName = function(){
		var PlayerName =  "Jugador" + (Math.floor(Math.random() * (100000))).toString();
		return PlayerName;
	}
	
	// Metodo para mezclar un array
	shuffle = function(o){
		for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	};
	
	// Metodo para generar numero aleatorio de 4 cifras distintas
	GenerateNum_4uniqueCharacters = function(){
		var Array = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		var String = Array[0].toString();
		for (var i = 1; i < 4; i++) {
			String += Array[i].toString();
		}
		return String;
	}
	
	return {
        "Register": function() { Register(); },
        "SetNumber": function() { SetNumber(); },
        "AttemptNumber": function() { AttemptNumber(); },
		"GeneratePlayerName": function() { GeneratePlayerName(); },
		"GenerateNum_4uniqueCharacters": function() { GenerateNum_4uniqueCharacters(); }
    }
}