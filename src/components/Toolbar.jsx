import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import * as actions from "../actions";
import * as selectors from "../selectors";
import config from "../../config";

import { Tabs, TabList, TabPanel } from "react-tabs";
import FilterListPanel from "./controls/FilterListPanel";
import CategoriesListPanel from "./controls/CategoriesListPanel";
import ShapesListPanel from "./controls/ShapesListPanel";
import BottomActions from "./controls/BottomActions";
import copy from "../common/data/copy.json";
import {
  trimAndEllipse,
  getImmediateFilterParent,
  getFilterSiblings,
  getFilterAncestors,
  addToColoringSet,
  removeFromColoringSet,
  mapCategoriesToPaths,
  getCategoryIdxs,
  getFilterIdx,
} from "../common/utilities";
import { ToolbarButton } from "./controls/atoms/ToolbarButton";
import { FullscreenToggle } from "./controls/FullScreenToggle";
import DownloadPanel from "./controls/DownloadPanel";

export default function Toolbar({ methods, isNarrative }) {
  const dispatch = useDispatch();
  const boundActions = bindActionCreators(actions, dispatch);

  const [selected, setSelected] = useState(0);
  const [active, setActive] = useState(false);

  // Redux state selectors
  const filters = useSelector(selectors.getFilters);
  const categories = useSelector(selectors.getCategories);
  const narratives = useSelector(selectors.selectNarratives);
  const shapes = useSelector(selectors.getShapes);
  const language = useSelector((state) => state.app.language);
  const toolbarCopy = useSelector((state) => state.app.toolbar);
  const activeFilters = useSelector(selectors.getActiveFilters);
  const activeCategories = useSelector(selectors.getActiveCategories);
  const activeShapes = useSelector(selectors.getActiveShapes);
  const coloringSet = useSelector((state) => state.app.associations.coloringSet);
  const maxNumOfColors = useSelector((state) => state.ui.coloring.maxNumOfColors);
  const filterColors = useSelector((state) => state.ui.coloring.colors);
  const sitesShowing = useSelector((state) => state.app.flags.isShowingSites);
  const infoShowing = useSelector((state) => state.app.flags.isInfopopup);
  const features = useSelector(selectors.getFeatures);
  const domain = useSelector((state) => state.domain); // Assuming domain is stored here

  const selectTab = (tabIndex) => {
    let newActive = true;
    if (selected === tabIndex && active === true) {
      newActive = false;
    }
    setSelected(tabIndex);
    setActive(newActive);
  };

  const onSelectFilter = (key, matchingKeys) => {
    let updatedMatchingKeys = [...matchingKeys];
    const parent = getImmediateFilterParent(key);
    const isTurningOff = activeFilters.includes(key);

    if (!isTurningOff) {
      const updatedColoringSet = addToColoringSet(coloringSet, updatedMatchingKeys);
      if (updatedColoringSet.length <= maxNumOfColors) {
        boundActions.updateColoringSet(updatedColoringSet);
      }
    } else {
      if (parent && activeFilters.includes(parent)) {
        const siblings = getFilterSiblings(filters, parent, key);
        let siblingsOff = true;
        for (const sibling of siblings) {
          if (activeFilters.includes(sibling)) {
            siblingsOff = false;
            break;
          }
        }

        if (siblingsOff) {
          const grandparentsOn = getFilterAncestors(key).filter((filt) =>
            activeFilters.includes(filt)
          );
          updatedMatchingKeys = updatedMatchingKeys.concat(grandparentsOn);
        }
      }

      const updatedColoringSet = removeFromColoringSet(coloringSet, updatedMatchingKeys);
      boundActions.updateColoringSet(updatedColoringSet);
    }
    methods.onSelectFilter(updatedMatchingKeys);
    boundActions.updateSelected([]);
  };

  const renderClosePanel = () => (
    <div className="panel-header" onClick={() => selectTab(selected)}>
      <div className="caret" />
    </div>
  );

  const goToNarrative = (narrative) => {
    methods.onSelectNarrative(narrative);
  };

  const renderToolbarNarrativePanel = () => {
    const { panels } = toolbarCopy;
    return (
      <TabPanel>
        <h2>{panels.narratives.label}</h2>
        <p>{panels.narratives.description}</p>
        {narratives.map((narr, idx) => (
          <div key={idx} className="panel-action action">
            <button onClick={() => goToNarrative(narr)}>
              <p>{narr.id}</p>
              <p>
                <small>{trimAndEllipse(narr.desc, 120)}</small>
              </p>
            </button>
          </div>
        ))}
      </TabPanel>
    );
  };

  const renderToolbarCategoriesPanel = () => {
    const { categories: panelCategories } = toolbarCopy.panels;
    const catMap = mapCategoriesToPaths(categories, Object.keys(panelCategories));

    return (
      <div>
        {Object.keys(catMap).map((type) => {
          const children = catMap[type];
          return (
            <TabPanel key={type}>
              <CategoriesListPanel
                categories={children}
                activeCategories={activeCategories}
                onCategoryFilter={methods.onCategoryFilter}
                language={language}
                title={panelCategories[type].label}
                description={panelCategories[type].description}
              />
            </TabPanel>
          );
        })}
      </div>
    );
  };

  const renderToolbarFilterPanel = () => {
    const { panels } = toolbarCopy;
    return (
      <TabPanel>
        <FilterListPanel
          filters={filters}
          activeFilters={activeFilters}
          onSelectFilter={onSelectFilter}
          language={language}
          coloringSet={coloringSet}
          filterColors={filterColors}
          title={panels.filters.label}
          description={panels.filters.description}
        />
      </TabPanel>
    );
  };

  const renderToolbarShapePanel = () => {
    const { panels } = toolbarCopy;
    if (!features.USE_SHAPES) return null;

    return (
      <TabPanel>
        <ShapesListPanel
          shapes={shapes}
          activeShapes={activeShapes}
          onShapeFilter={methods.onShapeFilter}
          language={language}
          title={panels.shapes.label}
          description={panels.shapes.description}
        />
      </TabPanel>
    );
  };

  const renderToolbarDownloadPanel = () => {
    const { panels } = toolbarCopy;
    return (
      <TabPanel>
        <DownloadPanel
          language={language}
          title={panels.download.label}
          description={panels.download.description}
          domain={domain}
        />
      </TabPanel>
    );
  };

  const renderToolbarTab = (tabIndex, label, iconKey, key) => (
    <ToolbarButton
      key={key}
      label={label}
      iconKey={iconKey}
      isActive={selected === tabIndex && active === true}
      onClick={() => selectTab(tabIndex)}
    />
  );

  const renderToolbarCategoryTabs = (idxs) => {
    const { categories: panelCategories } = toolbarCopy.panels;
    return (
      <div>
        {Object.keys(idxs).map((key) =>
          renderToolbarTab(idxs[key], panelCategories[key].label, panelCategories[key].icon, key)
        )}
      </div>
    );
  };

  const renderToolbarPanels = () => {
    const panelClasses = active === true ? "toolbar-panels" : "toolbar-panels folded";
    return (
      <div className={panelClasses}>
        {renderClosePanel()}
        {narratives && narratives.length !== 0 && renderToolbarNarrativePanel()}
        {features.USE_CATEGORIES && renderToolbarCategoriesPanel()}
        {features.USE_ASSOCIATIONS && renderToolbarFilterPanel()}
        {features.USE_SHAPES && renderToolbarShapePanel()}
        {features.USE_DOWNLOAD && renderToolbarDownloadPanel()}
      </div>
    );
  };

  const renderToolbarTabs = () => {
    const narrativesExist = narratives && narratives.length !== 0;
    let title = copy[language]?.toolbar.title || "";
    if (config.display_title) title = config.display_title;
    const { panels } = toolbarCopy;

    const narrativesIdx = 0;
    const categoryIdxs = getCategoryIdxs(
      Object.keys(panels.categories),
      narrativesExist ? 1 : 0
    );
    const numCategoryPanels = Object.keys(categoryIdxs).length;
    const filtersIdx = getFilterIdx(narrativesExist, features.USE_CATEGORIES, numCategoryPanels || 0);
    const shapesIdx = filtersIdx + features.USE_SHAPES;
    const downloadIdx = shapesIdx + features.USE_DOWNLOAD;

    return (
      <div className="toolbar">
        <div className="toolbar-header" onClick={methods.onTitle}>
          <p>{title}</p>
        </div>
        <div className="toolbar-tabs">
          <TabList>
            {narrativesExist &&
              renderToolbarTab(narrativesIdx, panels.narratives.label, panels.narratives.icon, "narratives")}
            {features.USE_CATEGORIES && renderToolbarCategoryTabs(categoryIdxs)}
            {features.USE_ASSOCIATIONS &&
              renderToolbarTab(filtersIdx, panels.filters.label, panels.filters.icon, "filters")}
            {features.USE_SHAPES &&
              renderToolbarTab(shapesIdx, panels.shapes.label, panels.shapes.icon, "shapes")}
            {features.USE_DOWNLOAD &&
              renderToolbarTab(downloadIdx, panels.download.label, panels.download.icon, "download")}
            {features.USE_FULLSCREEN && <FullscreenToggle language={language} />}
          </TabList>
        </div>
        <BottomActions
          info={{ enabled: infoShowing, toggle: boundActions.toggleInfoPopup }}
          sites={{ enabled: sitesShowing, toggle: boundActions.toggleSites }}
          cover={{ toggle: boundActions.toggleCover }}
          features={features}
        />
        <div id="made-with">
          Made with <a href="https://github.com/forensic-architecture/timemap">TimeMap</a>
          <br />
          Free software from <a href="https://forensic-architecture.org">Forensic Architecture</a>
        </div>
      </div>
    );
  };

  return (
    <div id="toolbar-wrapper" className={`toolbar-wrapper ${isNarrative ? "narrative-mode" : ""}`}>
      <Tabs onSelect={() => null} selectedIndex={selected}>
        {renderToolbarTabs()}
        {renderToolbarPanels()}
      </Tabs>
    </div>
  );
}
