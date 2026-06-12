!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
Var InstallTickets
Var InstallCaja
Var TicketsCheckbox
Var CajaCheckbox
Var ServerHost
Var GatewayHost
Var ServerHostInput
Var TerminalExePath

!macro customCheckAppRunning
  ; Desactiva el chequeo generico de electron-builder que en este flujo
  ; da falsos positivos al instalar/actualizar la terminal.
!macroend

!macro customInit
  StrCpy $INSTDIR "C:\mardeltech\sistemadetickets\SistemaTerminal"
  ReadEnvStr $ServerHost "COMPUTERNAME"
  StrCpy $GatewayHost $ServerHost
!macroend

!macro customPageAfterChangeDir
  PageEx custom
    PageCallbacks componentsPageCreate componentsPageLeave
  PageExEnd
!macroend

Function componentsPageCreate
  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 16u "Seleccione que modulos desea instalar en la terminal. Puede instalar uno o ambos."
  Pop $0

  ${NSD_CreateLabel} 0 20u 100% 12u "Nombre o IP del servidor (gateway y licencias)"
  Pop $0

  ${NSD_CreateText} 0 34u 100% 12u "$ServerHost"
  Pop $ServerHostInput

  ${NSD_CreateCheckbox} 0 56u 100% 12u "Sistema de Tickets / Servicio Tecnico"
  Pop $TicketsCheckbox
  ${NSD_Check} $TicketsCheckbox

  ${NSD_CreateCheckbox} 0 76u 100% 12u "Sistema de Caja"
  Pop $CajaCheckbox
  ${NSD_Check} $CajaCheckbox

  nsDialogs::Show
FunctionEnd

Function componentsPageLeave
  ${NSD_GetText} $ServerHostInput $ServerHost
  ${NSD_GetState} $TicketsCheckbox $InstallTickets
  ${NSD_GetState} $CajaCheckbox $InstallCaja
  StrCpy $GatewayHost $ServerHost

  ${If} $ServerHost == ""
    MessageBox MB_ICONEXCLAMATION "Debe indicar el nombre o IP del servidor."
    Abort
  ${EndIf}

  ${If} $ServerHost == "localhost"
    StrCpy $GatewayHost "127.0.0.1"
  ${ElseIf} $ServerHost == "127.0.0.1"
    StrCpy $GatewayHost "127.0.0.1"
  ${Else}
    ReadEnvStr $0 "COMPUTERNAME"
    ${If} $ServerHost == $0
      StrCpy $GatewayHost "127.0.0.1"
    ${EndIf}
  ${EndIf}

  ${If} $InstallTickets != ${BST_CHECKED}
  ${AndIf} $InstallCaja != ${BST_CHECKED}
    MessageBox MB_ICONEXCLAMATION "Seleccione al menos un modulo para instalar."
    Abort
  ${EndIf}
FunctionEnd
!endif

!macro customInstall
  Delete "$newStartMenuLink"
  Delete "$newDesktopLink"

  CreateDirectory "$SMPROGRAMS\Sistema Tecnico y Caja"
  StrCpy $TerminalExePath "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ${If} $InstallTickets == ${BST_CHECKED}
    CreateShortCut "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Tickets.lnk" "$TerminalExePath" "--modulo=tickets" "$INSTDIR\resources\icons\tickets.ico" 0 "" "" "Sistema de Tickets / Servicio Tecnico"
    CreateShortCut "$DESKTOP\Sistema de Tickets.lnk" "$TerminalExePath" "--modulo=tickets" "$INSTDIR\resources\icons\tickets.ico" 0 "" "" "Sistema de Tickets / Servicio Tecnico"
  ${EndIf}

  ${If} $InstallCaja == ${BST_CHECKED}
    CreateShortCut "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Caja.lnk" "$TerminalExePath" "--modulo=caja" "$INSTDIR\resources\icons\caja.ico" 0 "" "" "Sistema de Caja"
    CreateShortCut "$DESKTOP\Sistema de Caja.lnk" "$TerminalExePath" "--modulo=caja" "$INSTDIR\resources\icons\caja.ico" 0 "" "" "Sistema de Caja"
  ${EndIf}

  FileOpen $0 "$INSTDIR\app.config.json" "w"
  FileWrite $0 "{$\r$\n"
  FileWrite $0 "  $\"apiUrl$\": $\"http://$GatewayHost:3000$\",$\r$\n"
  FileWrite $0 "  $\"licenseMode$\": $\"server$\",$\r$\n"
  FileWrite $0 "  $\"licenseServerUrl$\": $\"https://sistematickets.licences.mardeltech.com$\"$\r$\n"
  FileWrite $0 "}$\r$\n"
  FileClose $0

  ${If} ${FileExists} "$TerminalExePath"
    ${If} $InstallTickets == ${BST_CHECKED}
      ExecShell "" "$TerminalExePath" "--modulo=tickets"
    ${ElseIf} $InstallCaja == ${BST_CHECKED}
      ExecShell "" "$TerminalExePath" "--modulo=caja"
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Sistema de Tickets.lnk"
  Delete "$DESKTOP\Sistema de Caja.lnk"
  Delete "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Tickets.lnk"
  Delete "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Caja.lnk"
  RMDir "$SMPROGRAMS\Sistema Tecnico y Caja"
!macroend
