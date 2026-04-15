Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::RootElement
$conditions = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, '덱 관리')
$windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $conditions)
foreach ($window in $windows) {
  $all = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($element in $all) {
    $name = $element.Current.Name
    $type = $element.Current.ControlType.ProgrammaticName
    if ($name) { Write-Output "$type`t$name" }
  }
}
