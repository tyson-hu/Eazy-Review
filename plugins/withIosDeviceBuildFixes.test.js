/**
 * @jest-environment node
 *
 * Deterministic coverage for the CNG plugin that owns Xcode 27 / physical-iPhone
 * native generation. Asserts generated iOS project files — not plugin source text.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PLUGIN_ABS = path.resolve(__dirname, 'withIosDeviceBuildFixes.js');
const REPO_ROOT = path.resolve(__dirname, '..');
const REPO_PACKAGE = require(path.join(REPO_ROOT, 'package.json'));

/**
 * @returns {{ tmp: string, iosRoot: string, appName: string, cleanup: () => void }}
 */
function createPrebuildFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eazy-ios-device-plugin-'));
  const appName = 'FixtureApp';

  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    `${JSON.stringify(
      {
        name: 'eazy-ios-device-plugin-fixture',
        version: '1.0.0',
        main: 'expo-router/entry',
        dependencies: REPO_PACKAGE.dependencies,
        devDependencies: {
          '@babel/core': REPO_PACKAGE.devDependencies['@babel/core'],
        },
      },
      null,
      2,
    )}\n`,
  );

  fs.writeFileSync(
    path.join(tmp, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          name: appName,
          slug: 'fixture-app',
          version: '1.0.0',
          ios: { bundleIdentifier: 'com.eazy.fixture' },
          plugins: [PLUGIN_ABS],
        },
      },
      null,
      2,
    )}\n`,
  );

  fs.symlinkSync(
    path.join(REPO_ROOT, 'node_modules'),
    path.join(tmp, 'node_modules'),
  );

  return {
    tmp,
    iosRoot: path.join(tmp, 'ios'),
    appName,
    cleanup: () => {
      fs.rmSync(tmp, { recursive: true, force: true });
    },
  };
}

/**
 * @param {string} projectRoot
 */
function runIosPrebuild(projectRoot) {
  execFileSync(
    process.execPath,
    [
      require.resolve('expo/bin/cli'),
      'prebuild',
      '--platform',
      'ios',
      '--no-install',
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        CI: '1',
        // Avoid pulling interactive Expo telemetry / prompts inside Jest.
        EXPO_NO_TELEMETRY: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

/**
 * @param {string} iosRoot
 * @param {string} appName
 */
function readGenerated(iosRoot, appName) {
  const pbxPath = path.join(iosRoot, `${appName}.xcodeproj`, 'project.pbxproj');
  const podPropsPath = path.join(iosRoot, 'Podfile.properties.json');
  const infoPlistPath = path.join(iosRoot, appName, 'Info.plist');
  const sceneDelegatePath = path.join(iosRoot, appName, 'SceneDelegate.swift');
  const appDelegatePath = path.join(iosRoot, appName, 'AppDelegate.swift');

  return {
    pbx: fs.readFileSync(pbxPath, 'utf8'),
    podProps: JSON.parse(fs.readFileSync(podPropsPath, 'utf8')),
    infoPlist: fs.readFileSync(infoPlistPath, 'utf8'),
    sceneDelegate: fs.readFileSync(sceneDelegatePath, 'utf8'),
    appDelegate: fs.readFileSync(appDelegatePath, 'utf8'),
    sceneDelegatePath,
  };
}

/**
 * @param {ReturnType<typeof readGenerated>} generated
 */
function assertPluginOwnedOutput(generated) {
  const sandboxMatches = generated.pbx.match(
    /ENABLE_USER_SCRIPT_SANDBOXING = NO/g,
  );
  expect(sandboxMatches).not.toBeNull();
  expect(sandboxMatches.length).toBeGreaterThanOrEqual(2);

  expect(generated.podProps.EXPO_USE_PRECOMPILED_MODULES).toBe('false');

  expect(generated.infoPlist).toContain('UIApplicationSceneManifest');
  expect(generated.infoPlist).toContain('UIApplicationSupportsMultipleScenes');
  // Prebuild may emit either XML `<false/>` or a boolean string form depending on tools.
  expect(generated.infoPlist).toMatch(
    /UIApplicationSupportsMultipleScenes[\s\S]{0,80}(false|<false\s*\/>)/,
  );
  expect(generated.infoPlist).toContain('UISceneDelegateClassName');
  expect(generated.infoPlist).toContain('SceneDelegate');

  expect(generated.sceneDelegate).toContain('UIWindowSceneDelegate');
  expect(generated.sceneDelegate).toContain('startReactNative');

  // Scene-owned boot: AppDelegate must not independently start React in didFinishLaunching.
  expect(generated.appDelegate).toContain('reactNativeFactory');
  expect(generated.appDelegate).toMatch(
    /Window \+ startReactNative live in SceneDelegate|SceneDelegate/,
  );
  expect(generated.appDelegate).not.toMatch(
    /factory\.startReactNative\s*\(/,
  );

  expect(generated.pbx).toContain('SceneDelegate.swift in Sources');
  const sourceMembership = (
    generated.pbx.match(/SceneDelegate\.swift in Sources/g) || []
  ).length;
  expect(sourceMembership).toBeGreaterThanOrEqual(1);
}

describe('withIosDeviceBuildFixes generated native output', () => {
  jest.setTimeout(120_000);

  it('applies sandbox, precompiled-module, and UIScene configuration to prebuild output', () => {
    const fixture = createPrebuildFixture();
    try {
      runIosPrebuild(fixture.tmp);
      const generated = readGenerated(fixture.iosRoot, fixture.appName);
      assertPluginOwnedOutput(generated);
    } finally {
      fixture.cleanup();
    }
  });

  it('is idempotent across a second prebuild (no duplicate scene files or memberships)', () => {
    const fixture = createPrebuildFixture();
    try {
      runIosPrebuild(fixture.tmp);
      const first = readGenerated(fixture.iosRoot, fixture.appName);
      assertPluginOwnedOutput(first);

      const firstSourceCount = (
        first.pbx.match(/SceneDelegate\.swift in Sources/g) || []
      ).length;
      const firstSandboxCount = (
        first.pbx.match(/ENABLE_USER_SCRIPT_SANDBOXING = NO/g) || []
      ).length;

      runIosPrebuild(fixture.tmp);
      const second = readGenerated(fixture.iosRoot, fixture.appName);
      assertPluginOwnedOutput(second);

      const secondSourceCount = (
        second.pbx.match(/SceneDelegate\.swift in Sources/g) || []
      ).length;
      const secondSandboxCount = (
        second.pbx.match(/ENABLE_USER_SCRIPT_SANDBOXING = NO/g) || []
      ).length;

      expect(secondSourceCount).toBe(firstSourceCount);
      expect(secondSandboxCount).toBe(firstSandboxCount);
      expect(second.podProps.EXPO_USE_PRECOMPILED_MODULES).toBe('false');

      // Single SceneDelegate file remains
      expect(fs.existsSync(second.sceneDelegatePath)).toBe(true);
      const sceneFiles = fs
        .readdirSync(path.join(fixture.iosRoot, fixture.appName))
        .filter((name) => name.includes('SceneDelegate'));
      expect(sceneFiles).toEqual(['SceneDelegate.swift']);
    } finally {
      fixture.cleanup();
    }
  });
});
