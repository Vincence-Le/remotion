// DriveScene.jsx
// Static React mockup of a Google-Drive-style interface, built to match the
// reference screenshot (My Drive > Preny AI > Design, empty "Drop files here" state).
// Meant as a starting point to paste into Cursor and wire up with Remotion:
//   - swap the <DriveLogo /> placeholder for your own asset (avoid using Google's actual logo file)
//   - drive the file-card entrance with useCurrentFrame() + spring() once this is inside Remotion
//   - split into <DriveHeader/>, <DriveSidebar/>, <FileGrid/>, <Toast/> if you need to animate pieces independently

import React from "react";

// ---- Design tokens (approximating Material 3 / Drive's palette) ----
const colors = {
  bg: "#ffffff",
  sidebarBg: "#ffffff",
  border: "#e8eaed",
  text: "#202124",
  textMuted: "#5f6368",
  blue: "#1a73e8",
  blueBg: "#e8f0fe",
  chipBorder: "#dadce0",
  bannerBg: "#e8f0fe",
};

const fontStack =
  "'Google Sans', 'Product Sans', Roboto, Arial, sans-serif";

// ---- Generic logo placeholder (NOT Google's trademarked mark) ----
// Swap this for your own product's mark, or your uploaded asset, in Cursor.
function DriveLogo() {
  return (
    <svg width="40" height="36" viewBox="0 0 40 36" fill="none">
      <path d="M14 2 L26 2 L38 22 L26 22 Z" fill="#34a853" />
      <path d="M2 22 L14 2 L20 12 L8 32 Z" fill="#4285f4" />
      <path d="M8 32 L32 32 L38 22 L14 22 Z" fill="#fbbc04" />
    </svg>
  );
}

function IconButton({ children, size = 20 }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.textMuted,
        cursor: "pointer",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {children}
      </svg>
    </div>
  );
}

function SidebarItem({ label, active }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 24px",
        height: 32,
        borderRadius: "0 16px 16px 0",
        marginRight: 12,
        background: active ? colors.blueBg : "transparent",
        color: active ? colors.blue : colors.text,
        fontSize: 14,
        fontWeight: active ? 500 : 400,
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          background: active ? colors.blue : "#c4c7c5",
        }}
      />
      {label}
    </div>
  );
}

function EmptyStateIllustration() {
  // Simplified stand-in for Drive's "drop files" illustration
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
      <rect x="40" y="35" width="70" height="90" rx="6" fill="#e8f0fe" stroke="#c2d7fb" strokeWidth="2" />
      <path d="M25 40 L45 30 L45 60 Z" fill="#34a853" />
      <rect x="72" y="30" width="18" height="18" rx="4" fill="#fbbc04" />
      <path d="M95 110 L115 130 L130 105 Z" fill="#fbcfe8" opacity="0.6" />
      <circle cx="72" cy="70" r="20" fill="#fdd663" />
    </svg>
  );
}

export default function DriveScene({
  path = ["My Drive", "Preny AI", "Design"],
  showFile = false, // toggle this from Remotion frame logic to reveal the uploaded file
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: colors.bg,
        fontFamily: fontStack,
        color: colors.text,
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          height: 64,
          padding: "0 16px",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: 200 }}>
          <DriveLogo />
          <span style={{ fontSize: 22, color: "#5f6368" }}>Drive</span>
        </div>

        <div
          style={{
            flex: 1,
            maxWidth: 720,
            height: 46,
            borderRadius: 27,
            background: "#eef1f4",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 12,
            color: colors.textMuted,
            fontSize: 14,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke={colors.textMuted} strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke={colors.textMuted} strokeWidth="2" />
          </svg>
          Get answers from Drive
        </div>

        <div style={{ flex: 1 }} />
        <IconButton>
          <circle cx="12" cy="12" r="9" stroke={colors.textMuted} strokeWidth="1.6" />
        </IconButton>
        <IconButton>
          <circle cx="12" cy="12" r="9" stroke={colors.textMuted} strokeWidth="1.6" />
        </IconButton>
        <IconButton>
          <circle cx="12" cy="12" r="3" fill={colors.textMuted} />
        </IconButton>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          }}
        />
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 256,
            borderRight: `1px solid ${colors.border}`,
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ padding: "0 16px", marginBottom: 16 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                height: 56,
                padding: "0 20px 0 16px",
                borderRadius: 16,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 22, color: colors.blue }}>＋</span>
              New
            </div>
          </div>
          <SidebarItem label="Home" />
          <SidebarItem label="Projects" />
          <SidebarItem label="My Drive" active />
          <SidebarItem label="Shared drives" />
          <SidebarItem label="Computers" />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Breadcrumb + toolbar */}
          <div style={{ padding: "16px 24px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 22 }}>
                {path.map((p, i) => (
                  <React.Fragment key={p}>
                    {i > 0 && <span style={{ color: colors.textMuted }}>›</span>}
                    <span style={{ color: i === path.length - 1 ? colors.text : colors.textMuted }}>
                      {p}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ flex: 1 }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 20,
                  border: `1px solid ${colors.chipBorder}`,
                  background: colors.blueBg,
                  color: colors.blue,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ✦ Ask Gemini
              </button>
              {["Type", "People", "Modified", "Source"].map((label) => (
                <button
                  key={label}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 20,
                    border: `1px solid ${colors.chipBorder}`,
                    background: "#fff",
                    color: colors.text,
                    fontSize: 13,
                  }}
                >
                  {label} ▾
                </button>
              ))}
            </div>
          </div>

          {/* Info banner */}
          <div
            style={{
              margin: "0 24px 16px",
              padding: "10px 16px",
              background: colors.bannerBg,
              borderRadius: 8,
              fontSize: 13,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: colors.blue }}>ⓘ</span>
            <span style={{ color: colors.blue, fontWeight: 500 }}>
              Try AI directly in your favorite apps
            </span>
            <span style={{ color: colors.textMuted }}>
              Use Gemini to generate drafts and refine content, plus get Gemini Pro.
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ color: colors.blue, fontWeight: 500 }}>Get started</span>
          </div>

          {/* Drop zone / file grid area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: showFile ? "flex-start" : "center",
              justifyContent: showFile ? "flex-start" : "center",
              padding: showFile ? 32 : 0,
            }}
          >
            {!showFile ? (
              <div style={{ textAlign: "center" }}>
                <EmptyStateIllustration />
                <div style={{ fontSize: 20, marginTop: 12 }}>Drop files here</div>
                <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                  or use the "New" button.
                </div>
              </div>
            ) : (
              <div
                style={{
                  width: 180,
                  borderRadius: 12,
                  border: `1px solid ${colors.border}`,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    height: 120,
                    background: "linear-gradient(135deg,#e8f0fe,#fce8e6)",
                  }}
                />
                <div style={{ padding: "8px 10px", fontSize: 12 }}>upload.png</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
