/**
 * iOS device / Xcode 27 continuous-native-generation fixes:
 *
 * 1) Disable Xcode User Script Sandboxing. Newer Xcode defaults
 *    ENABLE_USER_SCRIPT_SANDBOXING=YES; React Native's Bundle phase writes
 *    $DEST/ip.txt for Metro, which the sandbox rejects:
 *      Sandbox: bash deny(1) file-write-create .../EazyReview.app/ip.txt
 *
 * 2) Disable Expo precompiled module XCFrameworks on iOS. Precompiled
 *    ExpoModulesCore.framework can land in the app bundle without a valid
 *    codesign identity (0xe800801c / ApplicationVerificationFailed on device
 *    install). Building modules from source lets Xcode sign them correctly.
 *
 * 3) Adopt the UIKit UIScene life cycle required by the iOS 27 SDK / Xcode 27.
 *    Without UIApplicationSceneManifest + SceneDelegate, the process dies at
 *    launch with EXC_BREAKPOINT in
 *    ___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption.
 *    Expo SDK 57.0.10 templates still emit the pre-scene AppDelegate pattern;
 *    upstream Expo#46663 / #46734 land the same shape. See Apple TN3187.
 *
 * Tracked Expo config plugin; do not rely only on hand-edits under /ios.
 */
const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withPodfileProperties,
  withXcodeProject,
} = require('@expo/config-plugins');

/** @param {import('@expo/config-plugins').ExpoConfig} config */
function withDisableUserScriptSandboxing(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      if (typeof entry !== 'object' || entry === null || !entry.buildSettings) {
        continue;
      }
      entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }

    return config;
  });
}

/** @param {import('@expo/config-plugins').ExpoConfig} config */
function withDisablePrecompiledExpoModules(config) {
  return withPodfileProperties(config, (config) => {
    // Mapped by the generated Expo Podfile:
    // ENV['EXPO_USE_PRECOMPILED_MODULES'] = '0' if value == 'false'
    config.modResults.EXPO_USE_PRECOMPILED_MODULES = 'false';
    return config;
  });
}

/**
 * SceneDelegate + Info.plist manifest for iOS 27 UIScene requirement.
 * Mirrors the Expo bare-minimum template on main (ExpoAppSceneDelegate shape)
 * without requiring a newer Expo SDK that ships ExpoAppSceneDelegate.
 */
const SCENE_DELEGATE_CONTENTS = `internal import Expo
internal import ExpoModulesCore
import React
import UIKit

/**
 * UIWindowSceneDelegate for the UIKit scene life cycle (required by iOS 27 SDK).
 * Creates the window from the connecting scene and starts React Native there.
 * Forwards scene lifecycle / deep-link events to Expo subscribers and RCTLinking.
 */
@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }
    guard
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      fatalError(
        "SceneDelegate could not start React Native: AppDelegate is missing reactNativeFactory. "
          + "Create the factory in application(_:didFinishLaunchingWithOptions:)."
      )
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Keep AppDelegate.window in sync for code that reads UIApplication.shared.delegate?.window.
    appDelegate.window = window

    let browsingWebActivity = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(
        url: connectionOptions.urlContexts.first?.url,
        userActivity: browsingWebActivity
      )
    )

    Self.route(urlContexts: connectionOptions.urlContexts)
    connectionOptions.userActivities.forEach { Self.route(userActivity: $0) }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    Self.route(urlContexts: URLContexts)
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    Self.route(userActivity: userActivity)
  }
}

extension SceneDelegate {
  /// Rebuild launch options React Native Linking still reads from cold start.
  static func launchOptions(
    url: URL?,
    userActivity: NSUserActivity?
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url {
      let urlKey = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")
      launchOptions[urlKey] = url
    }
    if let userActivity {
      let userActivityDictionaryKey = UIApplication.LaunchOptionsKey(
        rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey"
      )
      launchOptions[userActivityDictionaryKey] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return launchOptions.isEmpty ? nil : launchOptions
  }

  static func route(urlContexts: Set<UIOpenURLContext>) {
    for context in urlContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      options[.openInPlace] = context.options.openInPlace
      _ = ExpoAppDelegateSubscriberManager.application(
        UIApplication.shared,
        open: context.url,
        options: options
      )
      RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: options
      )
    }
  }

  static func route(userActivity: NSUserActivity) {
    _ = ExpoAppDelegateSubscriberManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
`;

const APP_DELEGATE_CONTENTS = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Window + startReactNative live in SceneDelegate under the UIScene life
    // cycle required by the iOS 27 SDK / Xcode 27 (Apple TN3187).
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

/** @param {import('@expo/config-plugins').ExpoConfig} config */
function withUiSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  config = IOSConfig.XcodeProjectFile.withBuildSourceFile(config, {
    filePath: 'SceneDelegate.swift',
    contents: SCENE_DELEGATE_CONTENTS,
    overwrite: true,
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error(
        'withUiSceneLifecycle expects a Swift AppDelegate (Expo default).',
      );
    }
    config.modResults.contents = APP_DELEGATE_CONTENTS;
    return config;
  });

  return config;
}

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withIosDeviceBuildFixes(config) {
  config = withDisableUserScriptSandboxing(config);
  config = withDisablePrecompiledExpoModules(config);
  config = withUiSceneLifecycle(config);
  return config;
}

module.exports = withIosDeviceBuildFixes;
