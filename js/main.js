var GuessMyNumberClientFramework = function(){
	var PlayerID; //La ID del jugador
	var CurrentTarget; //La ID del jugador al que se le esta adivinando el numero actualmente
    var BoardRefreshInterval; //Para actualizar el tablero automaticamente
    var AttemptedNumbers = {}; //Guarda el historico de numeros intentados
    var UrlServer;
    var PortServer;
	
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
            PlayerID = response["privateUuid"]; //variable global
			var Msg = "Hola, " + response["name"] + "!<br/>ID: " + PlayerID; //mensaje de bienvenida al nuevo usuario
			$("#upper-content").html(Msg); //mando el mensaje en el div horizontal superior
			$("#divLogin").hide();
			$("#divSetNumber").show();
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
				var Msg = "<br/>Numero seteado: " + response["number"];
                $("#upper-content").append(Msg);
				$("#divSetNumber").hide();
				$("#divBoard").show();
				ShowBoard();
				
            });                         
        
            Request.fail(function(jqXHR, textStatus) {
                if(jqXHR.status == 521){
					var Msg = "Se ha reiniciado el servidor o supero el tiempo de inactividad, registrese nuevamente.";
					$("#divSetNumber").hide();
					$("#divLogin").show();
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
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID;
        var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });

        Request.done(function(response) {
            var TableRow; // Fila del tablero de jugadores
			var UUID; // Universally unique identifier
			
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
        });
    }
	
	// Metodo para actualizar el tablero de jugadores
    var RefreshBoard = function ()
    {
        var Url = UrlServer + ":" + PortServer + "/players/board/" + PlayerID;
        var Request = $.ajax({ type: "GET", url: Url, dataType: "json" });

        Request.done(function(response) {
            var TableRow; // Fila del tablero de jugadores
			var UUID; // Universally unique identifier

            // Verifico que no me hayan adivinado el numero, en caso de error lo mando a la pantalla para que setee el numero nuevamente
            if(response["me"][0]["numberActivated"] == false){
                window.clearInterval(BoardRefreshInterval); // Dejo de actualizar el tablero
				$("#divBoard").hide();
				$("#divSetNumber").show();
				$("#SetNumberResponse").html("Su numero ha sido adivinado. Por favor, ingrese otro para continuar.");
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
			
        });
		
    }
	
	// Metodo para mostrar avatares identicon
	var CreateIdenticon = function(UUID, Size){
		var ShorterUUID = UUID.substring(0, 8); // Trunca el string // 0=comienzo // 8=longitud
		var _Size = "&s=" + Size;
		var ImgURL = "http://www.gravatar.com/avatar/" + ShorterUUID + "?d=identicon&r=PG";
		ImgURL += Size ? _Size : "";
		var ImgHTML = '<img border="1" style="color: grey" id=img' + UUID + ' src=' + ImgURL + '></img> ';
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

                $("#tblNumbersGuessed tbody").append(NumberRow);

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
    } 
	
	// Metodo para mostrar los intentos de adivinacion realizados
	var ShowAttempts = function(UUID) {
		$('#tblNumbersGuessed tbody > tr').remove();
		if(AttemptedNumbers[UUID] != undefined){
            for(var i = 0; i < AttemptedNumbers[UUID].length; i++){
                var Row = '<tr id="' + AttemptedNumbers[UUID][i]["numberId"] + '"><td>' + AttemptedNumbers[UUID][i]["number"] + '</td> <td>' + AttemptedNumbers[UUID][i]["correct"] + '</td><td>' + AttemptedNumbers[UUID][i]["exist"] + '</td></tr>';
                $("#tblNumbersGuessed tbody").append(Row);
            }
            //$("#tblNumbersGuessed").show();
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
		ShowAttempts(UUID); // Muestra los intentos realizados a este jugador anteriormente
	}
	
	// Metodo para generar numero aleatorio de 4 cifras distintas
	/*var GenerateNum_4uniqueCharacters = function(){
		var Num = new Array();
		for (var i = 0; i < 4; i++) {
			do {
				var Num[i] = Math.floor(Math.random() * (10));
			} while (function(){
				for (var j = 0; j < Num.length; j++) {
					if (Num[i] == Num[j]) return true;
				}
				return false;
			});
		}
		for (i = 0; i < Num.length; i++) {
			NumStr += Num[i].toString();
		}
		return NumStr;
		
		
		for (var i = 0; i < 3; i++) {
				var PossibleNum;
				do {
					PossibleNum = (Math.floor(Math.random() * (10))).toString();
				}
				while (function(){
					for (var j = 0; j < Num.length; j++) {
						if (PossibleNum == Num.charAt(j)) return true;
					}
					return false;
				});
				Num += PossibleNum.toString();
		}
		return Num;
	}*/
	
	return {
        "Register":      function() { Register(); },
        "SetNumber":     function() { SetNumber(); },
        "AttemptNumber": function() { AttemptNumber(); }
    }
}