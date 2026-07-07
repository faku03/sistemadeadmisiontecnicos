!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!ifndef BUILD_UNINSTALLER
Var InstallSystem
Var SystemCheckbox
Var SharedTerminalDir
!macro customInit
  StrCpy $INSTDIR "C:\mardeltech\sistemadetickets"
!macroend

!macro customPageAfterChangeDir
  PageEx custom
    PageCallbacks serverPageCreate serverPageLeave
  PageExEnd
!macroend

Function serverPageCreate
  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 26u "Este instalador prepara el servidor de FaroDesk. Siempre instala PostgreSQL y el gateway del sistema."
  Pop $0

  ${NSD_CreateCheckbox} 0 36u 100% 12u "Instalar tambien FaroDesk en este servidor usando el instalador de terminal"
  Pop $SystemCheckbox
  ${NSD_Check} $SystemCheckbox

  ${NSD_CreateLabel} 0 58u 100% 24u "El instalador de terminal quedara guardado en C:\mardeltech\sistemadetickets\terminal para reutilizarlo en otras PCs."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function serverPageLeave
  ${NSD_GetState} $SystemCheckbox $InstallSystem
FunctionEnd
!endif

!macro customInstall
  Delete "$newStartMenuLink"
  Delete "$newDesktopLink"

  ${GetParent} "$INSTDIR" $SharedTerminalDir
  StrCpy $SharedTerminalDir "$SharedTerminalDir\terminal"
  CreateDirectory "$SharedTerminalDir"
  CopyFiles /SILENT "$INSTDIR\resources\terminal\*.*" "$SharedTerminalDir"

  ExecWait '"$SYSDIR\cmd.exe" /C ""$INSTDIR\resources\server\bootstrap-server.cmd" "$INSTDIR""'

  ${If} $InstallSystem == ${BST_CHECKED}
    FindFirst $0 $1 "$SharedTerminalDir\*.exe"
    ${If} $1 != ""
      MessageBox MB_ICONINFORMATION "La instalacion del servidor FaroDesk termino correctamente.$\r$\n$\r$\nAhora se abrira el instalador de terminal."
      ExecShell "" "$SharedTerminalDir\$1"
    ${Else}
      MessageBox MB_ICONEXCLAMATION "No se encontro el instalador de terminal FaroDesk en $SharedTerminalDir."
    ${EndIf}
    FindClose $0
  ${Else}
    MessageBox MB_ICONINFORMATION "La instalacion del servidor FaroDesk termino correctamente."
  ${EndIf}
!macroend

!macro customUnInstall
  ExecWait '"powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\server\uninstall-postgresql-task.ps1"'
  ExecWait '"powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\server\uninstall-gateway-task.ps1"'
!macroend
