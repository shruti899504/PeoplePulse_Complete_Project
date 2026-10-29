function departmentFilter(user, field = "department") {
  if (user.role === "ADMIN_HR") return {};
  if (user.role === "DEPARTMENT_HR") return { [field]: user.department };
  return {};
}

function canManageDepartment(user, department) {
  return user.role === "ADMIN_HR" || (
    user.role === "DEPARTMENT_HR" && user.department === department
  );
}

module.exports = { departmentFilter, canManageDepartment };
