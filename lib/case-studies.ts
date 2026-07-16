export type CaseStudyRoute = "/meteor/privacy";

export type CaseStudy = {
  route: CaseStudyRoute;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  signal: string;
  sections: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    route: "/meteor/privacy",
    title: "Meteor Privacy Policy",
    category: "Policy",
    summary:
      "Privacy details for Meteor: local task and habit data, crash reports, billing, export, retention, children, changes, and contact.",
    tags: ["Privacy", "Meteor", "Android", "Local-first"],
    signal: "policy surface",
    sections: [
      "Data We Collect",
      "Crash Reporting",
      "Purchases",
      "Export",
      "Retention",
      "Children",
      "Changes",
      "Contact",
    ],
  },
];

export function getCaseStudy(pathname: string) {
  return caseStudies.find((study) => study.route === pathname);
}
