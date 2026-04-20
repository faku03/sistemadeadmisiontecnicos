!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
Var InstallTickets
Var InstallCaja
Var TicketsCheckbox
Var CajaCheckbox

!macro customInit
  StrCpy $INSTDIR "C:\mardeltech\sistemadetickets"
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

  ${NSD_CreateLabel} 0 0 100% 24u "Seleccione que modulos desea instalar. Puede instalar uno o ambos."
  Pop $0

  ${NSD_CreateCheckbox} 0 34u 100% 12u "Sistema de Tickets / Servicio Tecnico"
  Pop $TicketsCheckbox
  ${NSD_Check} $TicketsCheckbox

  ${NSD_CreateCheckbox} 0 54u 100% 12u "Sistema de Caja"
  Pop $CajaCheckbox
  ${NSD_Check} $CajaCheckbox

  nsDialogs::Show
FunctionEnd

Function componentsPageLeave
  ${NSD_GetState} $TicketsCheckbox $InstallTickets
  ${NSD_GetState} $CajaCheckbox $InstallCaja

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

  ${If} $InstallTickets == ${BST_CHECKED}
    CopyFiles /SILENT "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$INSTDIR\Sistema de Tickets.exe"
    CreateShortCut "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Tickets.lnk" "$INSTDIR\Sistema de Tickets.exe" "--modulo=tickets" "$INSTDIR\Sistema de Tickets.exe" 0 "" "" "Sistema de Tickets / Servicio Tecnico"
    CreateShortCut "$DESKTOP\Sistema de Tickets.lnk" "$INSTDIR\Sistema de Tickets.exe" "--modulo=tickets" "$INSTDIR\Sistema de Tickets.exe" 0 "" "" "Sistema de Tickets / Servicio Tecnico"
  ${EndIf}

  ${If} $InstallCaja == ${BST_CHECKED}
    CopyFiles /SILENT "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$INSTDIR\Sistema de Caja.exe"
    CreateShortCut "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Caja.lnk" "$INSTDIR\Sistema de Caja.exe" "--modulo=caja" "$INSTDIR\Sistema de Caja.exe" 0 "" "" "Sistema de Caja"
    CreateShortCut "$DESKTOP\Sistema de Caja.lnk" "$INSTDIR\Sistema de Caja.exe" "--modulo=caja" "$INSTDIR\Sistema de Caja.exe" 0 "" "" "Sistema de Caja"
  ${EndIf}

  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\server\install-gateway-task.ps1" -InstallDir "$INSTDIR"'
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Sistema de Tickets.lnk"
  Delete "$DESKTOP\Sistema de Caja.lnk"
  Delete "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Tickets.lnk"
  Delete "$SMPROGRAMS\Sistema Tecnico y Caja\Sistema de Caja.lnk"
  RMDir "$SMPROGRAMS\Sistema Tecnico y Caja"
  Delete "$INSTDIR\Sistema de Tickets.exe"
  Delete "$INSTDIR\Sistema de Caja.exe"
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\server\uninstall-gateway-task.ps1"'
!macroend
