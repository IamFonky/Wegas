import * as React from 'react';
import PageLoader from '../../../Components/PageLoader';
import { connect, Dispatch } from 'react-redux';
import { State } from '../../../data/Reducer/reducers';
import SrcEditor from '../SrcEditor';
import { Page } from '../../../data/selectors';
import PageEditorHeader from './PageEditorHeader';
import { Toolbar } from '../Views/Toolbar';
import { Actions } from '../../../data';

interface PageDisplayProps {
  srcMode: boolean;
  defaultPageId: string;
  dispatch: Dispatch<State>;
}
class PageDisplay extends React.Component<
  PageDisplayProps,
  { currentPageId: string }
> {
  editor?: SrcEditor | null;
  constructor(props: PageDisplayProps) {
    super(props);
    this.state = { currentPageId: props.defaultPageId };
  }
  componentWillReceiveProps(nextProps: PageDisplayProps) {
    if (this.props.defaultPageId === undefined) {
      this.setState({
        currentPageId: nextProps.defaultPageId,
      });
    }
  }
  render() {
    return (
      <Toolbar>
        <Toolbar.Header>
          <PageEditorHeader key="header" pageId={this.state.currentPageId} />
        </Toolbar.Header>
        <Toolbar.Content>
          {this.props.srcMode ? (
            <Toolbar>
              <Toolbar.Header>
                <button
                  onClick={() => {
                    if (this.editor) {
                      const p = JSON.parse(this.editor.getValue()!);
                      this.props.dispatch(
                        Actions.PageActions.patch(this.state.currentPageId, p),
                      );
                    }
                  }}
                >
                  Save
                </button>
              </Toolbar.Header>
              <Toolbar.Content>
                <SrcEditor
                  ref={n => (this.editor = n)}
                  key="srcEditor"
                  value={JSON.stringify(
                    Page.select(this.state.currentPageId),
                    null,
                    2,
                  )}
                  language="json"
                />
              </Toolbar.Content>
            </Toolbar>
          ) : (
            <PageLoader id={this.state.currentPageId} key="pageloader" />
          )}
        </Toolbar.Content>
      </Toolbar>
    );
  }
}
export default connect(
  (state: State) => ({
    srcMode: state.global.pageSrc,
    defaultPageId: Page.selectDefaultId(),
  }),
  dispatch => ({ dispatch }),
)(PageDisplay);
