!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"

!ifndef BUILD_UNINSTALLER
Var InstallSystem
Var SystemCheckbox
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

  ${NSD_CreateLabel} 0 0 100% 26u "Este instalador prepara el servidor. Siempre instala PostgreSQL y el gateway del sistema."
  Pop $0

  ${NSD_CreateCheckbox} 0 36u 100% 12u "Instalar tambien el sistema en este servidor usando el instalador de terminal"
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

  CreateDirectory "$INSTDIR\terminal"
  CopyFiles /SILENT "$INSTDIR\resources\terminal\*.*" "$INSTDIR\terminal"

  ExecWait '"$SYSDIR\cmd.exe" /C ""$INSTDIR\resources\server\bootstrap-server.cmd" "$INSTDIR""'

  ${If} $InstallSystem == ${BST_CHECKED}
    FindFirst $0 $1 "$INSTDIR\terminal\*.exe"
    ${If} $1 != ""
      ExecWait '"$INSTDIR\terminal\$1"'
    ${Else}
      MessageBox MB_ICONEXCLAMATION "No se encontro el instalador de terminal en $INSTDIR\terminal."
    ${EndIf}
    FindClose $0
  ${EndIf}

  MessageBox MB_ICONINFORMATION "La instalacion del servidor termino.$\r$\n$\r$\nSi eligio instalar el sistema, se abrira el instalador de terminal."
!macroend

!macro customUnInstall
  ExecWait '"powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\server\uninstall-postgresql-task.ps1"'
  ExecWait '"powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\server\uninstall-gateway-task.ps1"'
!macroend
