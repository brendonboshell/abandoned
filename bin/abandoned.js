#! /usr/bin/env node
var path = require("path"),
    fs = require("fs"),
    async = require("async"),
    request = require("request"),
    CliTable = require("cli-table"),
    colors = require("colors/safe"),
    prettyDate = require("pretty-date"),
    ABANDONED_DAYS = 90,
    registryApiUrl = "https://registry.npmjs.org",
    packageJsonPath,
    packageJsonStr,
    packageConfig,
    packages,
    afterQueried;

packageJsonPath = path.join(process.cwd(), "package.json");

console.log("Looking for package.json in " + packageJsonPath + ".");

packageJsonStr = fs.readFileSync(packageJsonPath, {
  encoding: "utf8"
});
packageConfig = JSON.parse(packageJsonStr);
packages = Object.keys(packageConfig.dependencies || {})
  .concat(Object.keys(packageConfig.devDependencies || []));

console.log("Found " + packages.length + " packages.");

afterQueried = function (err, results) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  var table = new CliTable({
      head: [
        colors.gray('Package'),
        colors.gray('Last Modified'),
        colors.gray('Abandoned?')
      ],
      colWidths: [30, 40, 15]
  });

  results.sort(function (a, b) {
    return (b.modifiedDate - a.modifiedDate);
  });

  results.forEach(function (res) {
    var ageDays,
        isAbandoned;

    ageDays = ((new Date()) - res.modifiedDate) / 1000 / 60 / 60 / 24;
    isAbandoned = ageDays > ABANDONED_DAYS;

    table.push([
      res.name,
      prettyDate.format(res.modifiedDate),
      isAbandoned ? colors.red("Yes") : colors.green("No")
    ]);
  });

  console.log(table.toString());
};

async.map(packages, function (packageName, cb) {
  var afterGet,
      regUrl;

  regUrl = registryApiUrl + "/" + packageName;

  afterGet = function (err, resp) {
    var modifiedDate;

    if (err) {
      return cb(err);
    }

    modifiedDate = new Date(resp.body.time.modified);

    cb(null, {
      name: packageName,
      modifiedDate: modifiedDate
    });
  };

  request(regUrl, {
    json: true
  }, afterGet);
}, afterQueried);
