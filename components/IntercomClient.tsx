// components/IntercomClient.tsx
"use client";

import { useEffect } from "react";
import Intercom from '@intercom/messenger-js-sdk';

// CSS to hide ONLY the Intercom launcher (chat bubble), but NOT the messenger widget
const hideIntercomStyle = `
  /* Hide ONLY the Intercom launcher (chat bubble button) */
  #intercom-container .intercom-launcher,
  .intercom-launcher-frame,
  .intercom-app-launcher-enabled .intercom-launcher,
  .intercom-launcher,
  iframe[name="intercom-launcher-frame"],
  [class*="intercom"][class*="launcher"]:not([class*="messenger"]):not([class*="widget"]),
  div[aria-label*="Open Intercom"],
  .intercom-namespace .intercom-launcher-frame,
  .intercom-launcher-discovery-frame {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  
  /* DO NOT hide the messenger widget itself when it's opened - only hide the launcher */
  /* The messenger will be shown/hidden by Intercom itself when show()/hide() is called */
`;

// Replace with your real app_id
const INTERCOM_APP_ID = "o5up1xz3";

export default function IntercomClient() {
  useEffect(() => {
    let mounted = true;
    let messengerInstance: any = null;

    // Initialize Intercom using the official SDK
    try {
      console.log('🔵 IntercomClient: Initializing Intercom...');
      
      // The Intercom SDK returns a messenger instance
      messengerInstance = Intercom({
        app_id: INTERCOM_APP_ID,
        hide_default_launcher: true, // Hide the default chat bubble
      });

      console.log('✅ IntercomClient: Intercom initialized, messengerInstance:', messengerInstance);
      console.log('🔵 IntercomClient: Messenger instance methods:', messengerInstance ? Object.keys(messengerInstance) : 'none');
      console.log('🔵 IntercomClient: Messenger instance type:', typeof messengerInstance);
      console.log('🔵 IntercomClient: Full messenger instance:', messengerInstance);

      // Store instance globally
      (window as any).__intercomMessenger = messengerInstance;
      
      // Ensure Intercom is booted - the SDK should do this, but let's make sure
      // Wait a bit for Intercom to fully initialize
      setTimeout(() => {
        const win = window as any;
        if (typeof win.Intercom === "function") {
          // Try to boot if not already booted
          try {
            win.Intercom("boot", {
              app_id: INTERCOM_APP_ID,
              hide_default_launcher: true
            });
            console.log('✅ IntercomClient: Intercom booted');
          } catch (_bootErr) {
            // Might already be booted, that's okay
            console.log('ℹ️ IntercomClient: Intercom already booted or boot failed (this is okay)');
          }
        }
      }, 500);
      
      // Ensure window.Intercom is set up (the SDK should do this, but let's make sure)
      if (typeof (window as any).Intercom !== "function" && messengerInstance) {
        // The SDK might expose Intercom differently, let's check
        console.log('⚠️ IntercomClient: window.Intercom not found, checking messenger instance...');
      }

      // Set up helper function to open Intercom - use window reference to avoid closure issues
      const setupOpenIntercom = () => {
        (window as any).openIntercom = function() {
          console.log('🔵 IntercomClient: openIntercom() called - START');
          
          const win = window as any;
          const stored = win.__intercomMessenger;
          
          console.log('🔵 IntercomClient: Current state:', {
            hasIntercom: typeof win.Intercom === "function",
            hasStoredMessenger: !!stored,
            storedType: typeof stored,
            storedKeys: stored ? Object.keys(stored) : 'none',
          });
          
          try {
            // Method 1: Try stored messenger instance from window (most reliable)
            if (stored) {
              console.log('🔵 IntercomClient: Checking stored messenger instance...');
              console.log('🔵 IntercomClient: Stored instance:', stored);
              console.log('🔵 IntercomClient: Stored methods:', Object.keys(stored));
              
              if (typeof stored.showMessenger === "function") {
                console.log('✅ IntercomClient: Calling __intercomMessenger.showMessenger()');
                stored.showMessenger();
                console.log('✅ IntercomClient: showMessenger() called');
                return;
              }
              if (typeof stored.show === "function") {
                console.log('✅ IntercomClient: Calling __intercomMessenger.show()');
                stored.show();
                console.log('✅ IntercomClient: show() called');
                return;
              }
              // Try any method that might open the messenger
              if (typeof stored.open === "function") {
                console.log('✅ IntercomClient: Calling __intercomMessenger.open()');
                stored.open();
                return;
              }
            }
            
            // Method 2: Try window.Intercom('show') - standard way
            if (typeof win.Intercom === "function") {
              console.log('✅ IntercomClient: Calling Intercom("show")');
              try {
                // First ensure Intercom is booted
                try {
                  win.Intercom("boot", {
                    app_id: INTERCOM_APP_ID,
                    hide_default_launcher: true
                  });
                  console.log('✅ IntercomClient: Intercom booted before show');
                } catch (_bootErr) {
                  // Already booted, that's fine
                  console.log('ℹ️ IntercomClient: Intercom already booted');
                }
                
                // Wait a moment for boot to complete, then show
                setTimeout(() => {
                  try {
                    win.Intercom("show");
                    console.log('✅ IntercomClient: Intercom("show") called successfully');
                  } catch (showErr) {
                    console.warn('⚠️ IntercomClient: Intercom("show") failed:', showErr);
                  }
                }, 100);
                
                return;
              } catch (showError: any) {
                console.warn('⚠️ IntercomClient: Intercom("show") failed:', showError?.message || showError);
                console.warn('⚠️ IntercomClient: Error details:', showError);
              }
            }
            
            console.warn("⚠️ IntercomClient: All methods failed - Intercom not available");
            console.log('🔵 IntercomClient: Final debug info:', {
              hasIntercom: typeof win.Intercom === "function",
              hasStoredMessenger: !!stored,
              storedMethods: stored ? Object.keys(stored) : [],
            });
          } catch (err) {
            console.error("🔴 IntercomClient: openIntercom() error", err);
            console.error("🔴 IntercomClient: Error stack:", (err as Error)?.stack);
          }
          console.log('🔵 IntercomClient: openIntercom() called - END');
        };
        
        console.log('✅ IntercomClient: openIntercom function set up');
      };

      // Wait for window.Intercom to be available (it might be set up asynchronously)
      const waitForIntercom = () => {
        if (!mounted) return;
        
        if (typeof (window as any).Intercom === "function") {
          console.log('✅ IntercomClient: window.Intercom is now available');
          setupOpenIntercom();
        } else {
          console.log('⏳ IntercomClient: Waiting for window.Intercom...');
          setTimeout(waitForIntercom, 200);
        }
      };
      
      // Set up immediately (in case it's already available)
      setupOpenIntercom();
      
      // Also wait for it to become available
      setTimeout(waitForIntercom, 100);

    } catch (err) {
      console.error("Failed to initialize Intercom:", err);
    }

    return () => {
      mounted = false;
      // Optionally shutdown Intercom on unmount:
      try {
        const w = window as any;
        if (typeof w.Intercom === "function") {
          w.Intercom("shutdown");
        }
      } catch (_e) {
        // ignore
      }
    };
  }, []);

  // This component renders nothing visible — it only initializes intercom and hides the launcher
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: hideIntercomStyle }} />
    </>
  );
}
